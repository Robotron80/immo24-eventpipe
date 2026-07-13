import { dialog, ipcMain, shell, type BrowserWindow, type IpcMainInvokeEvent, type OpenDialogOptions } from 'electron'
import path from 'node:path'

import { classifyWav } from '../shared/classifier'
import { buildBounceMapping, buildLegacyMapping, isSupportedChannelCount } from '../shared/mapping'
import type {
  AnalyzeMxfResult,
  AnalyzeWavResult,
  EventPipeSettings,
  ExportHistoryEntry,
  ExportJobRequest,
  ExportJobResult,
} from '../shared/types'
import { exportMxfWithMappedAudio } from './ffmpegService'
import { analyzeMxfWithFfprobe, analyzeWavWithFfprobe } from './ffprobeService'
import { appendExportHistory, readExportHistory } from './historyService'
import { saveSettings } from './settingsService'

type WorkflowStartPayload = { mxfPath?: string; wavPath?: string }

interface RegisterIpcHandlersOptions {
  getActiveSettings: () => EventPipeSettings
  setActiveSettings: (settings: EventPipeSettings) => void
  getActiveConfigPath: () => string
  getActiveHistoryPath: () => string
  openWorkflowWindow: (payload?: WorkflowStartPayload) => void
  workflowStartPayloadByWebContentsId: Map<number, WorkflowStartPayload>
  getDialogOwnerWindow: () => BrowserWindow | null | undefined
  debugLog: (message: string, context?: Record<string, unknown>) => void
  withRuntimeDebugLogging: (settings: EventPipeSettings) => EventPipeSettings
  isTrustedRenderer: (webContentsId: number, frameUrl: string) => boolean
}

function createHistoryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function isPathWithin(parentPath: string, candidatePath: string): boolean {
  const relative = path.relative(parentPath, candidatePath)
  return relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative)
}

export function registerIpcHandlers(options: RegisterIpcHandlersOptions): void {
  const {
    getActiveSettings,
    setActiveSettings,
    getActiveConfigPath,
    getActiveHistoryPath,
    openWorkflowWindow,
    workflowStartPayloadByWebContentsId,
    getDialogOwnerWindow,
    debugLog,
    withRuntimeDebugLogging,
    isTrustedRenderer,
  } = options

  function assertTrustedSender(event: IpcMainInvokeEvent): void {
    const frameUrl = event.senderFrame?.url ?? ''
    if (isTrustedRenderer(event.sender.id, frameUrl)) {
      return
    }

    throw new Error('Untrusted renderer attempted to call privileged IPC handler.')
  }

  function guarded<Args extends unknown[], Result>(
    handler: (event: IpcMainInvokeEvent, ...args: Args) => Promise<Result> | Result,
  ): (event: IpcMainInvokeEvent, ...args: Args) => Promise<Result> | Result {
    return (event, ...args) => {
      assertTrustedSender(event)
      return handler(event, ...args)
    }
  }

  ipcMain.handle('eventpipe:get-settings', guarded(() => {
    return {
      settings: getActiveSettings(),
      configPath: getActiveConfigPath(),
    }
  }))

  ipcMain.handle('eventpipe:open-workflow-window', guarded((_event, payload?: WorkflowStartPayload) => {
    openWorkflowWindow(payload)
    return true
  }))

  ipcMain.handle('eventpipe:get-workflow-start-payload', guarded((event) => {
    const payload = workflowStartPayloadByWebContentsId.get(event.sender.id)
    workflowStartPayloadByWebContentsId.delete(event.sender.id)
    return payload
  }))

  ipcMain.handle('eventpipe:get-export-history', guarded(async (_event, limit?: number) => {
    const safeLimit = Math.max(1, Math.min(100, typeof limit === 'number' ? Math.floor(limit) : 20))
    return readExportHistory(getActiveHistoryPath(), safeLimit)
  }))

  ipcMain.handle('eventpipe:pick-directory', guarded(async (_event, initialPath?: string) => {
    const ownerWindow = getDialogOwnerWindow()
    const dialogOptions: OpenDialogOptions = {
      title: 'Ordner auswählen',
      properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
      defaultPath: initialPath?.trim() || undefined,
    }

    const result = ownerWindow
      ? await dialog.showOpenDialog(ownerWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)

    if (result.canceled || result.filePaths.length === 0) {
      return undefined
    }

    return result.filePaths[0]
  }))

  ipcMain.handle('eventpipe:open-path', guarded(async (_event, targetPath?: string) => {
    if (!targetPath?.trim()) {
      return false
    }

    const resolvedTargetPath = path.resolve(targetPath)
    const allowedLogsRoot = path.resolve(getActiveSettings().tempExportFolder, 'logs')

    if (!isPathWithin(allowedLogsRoot, resolvedTargetPath)) {
      return false
    }

    if (!resolvedTargetPath.toLowerCase().endsWith('.log')) {
      return false
    }

    const openResult = await shell.openPath(resolvedTargetPath)
    return openResult.length === 0
  }))

  ipcMain.handle('eventpipe:save-settings', guarded(async (_event, input: Partial<EventPipeSettings>) => {
    const merged = {
      ...getActiveSettings(),
      ...input,
    }

    const saved = await saveSettings(getActiveConfigPath(), merged)
    const runtimeSettings = withRuntimeDebugLogging(saved)
    setActiveSettings(runtimeSettings)
    debugLog('Settings saved', { configPath: getActiveConfigPath() })

    return {
      settings: runtimeSettings,
      configPath: getActiveConfigPath(),
    }
  }))

  ipcMain.handle('eventpipe:analyze-mxf', guarded(async (_event, mxfPath: string): Promise<AnalyzeMxfResult> => {
    debugLog('Analyze MXF requested', { mxfPath })
    const probe = await analyzeMxfWithFfprobe(mxfPath, getActiveSettings().ffprobePath)
    return { probe }
  }))

  ipcMain.handle('eventpipe:analyze-wav', guarded(async (_event, wavPath: string): Promise<AnalyzeWavResult> => {
    debugLog('Analyze WAV requested', { wavPath })
    const probe = await analyzeWavWithFfprobe(wavPath, getActiveSettings().ffprobePath)
    const classification = classifyWav(probe)

    if (!isSupportedChannelCount(probe.channels)) {
      throw new Error(`Unsupported channel count ${probe.channels}. Allowed: 2, 4, 6, 8.`)
    }

    const mapping =
      classification.type === 'legacy-surround-track'
        ? buildLegacyMapping(probe.channels)
        : buildBounceMapping(probe.channels, classification.trackNames)

    return {
      probe,
      classification,
      mapping,
    }
  }))

  ipcMain.handle('eventpipe:export-job', guarded(async (event, request: ExportJobRequest): Promise<ExportJobResult> => {
    if (!request.mxfPath || !request.wavPath || request.mapping.length === 0) {
      throw new Error('Export request is incomplete.')
    }

    debugLog('Export requested', {
      mxfPath: request.mxfPath,
      wavPath: request.wavPath,
      mappingEntries: request.mapping.length,
    })

    event.sender.send('eventpipe:export-progress', {
      percent: 0,
    })

    try {
      const result = await exportMxfWithMappedAudio(request, getActiveSettings(), (update) => {
        event.sender.send('eventpipe:export-progress', update)
      })

      const successEntry: ExportHistoryEntry = {
        id: createHistoryId(),
        timestamp: new Date().toISOString(),
        status: 'success',
        mxfPath: request.mxfPath,
        wavPath: request.wavPath,
        outputPath: result.outputPath,
        tempOutputPath: result.tempOutputPath,
        publishedPath: result.publishedPath,
        publishConflictResolved: result.publishConflictResolved,
        logPath: result.logPath,
        detectedWavType: request.metadata?.detectedWavType,
        selectedWavType: request.metadata?.selectedWavType,
        manualSelectionApplied: request.metadata?.manualSelectionApplied,
        classificationReason: request.metadata?.classificationReason,
        mappingCount: request.mapping.length,
      }

      await appendExportHistory(getActiveHistoryPath(), successEntry)

      event.sender.send('eventpipe:export-progress', {
        percent: 100,
      })

      return result
    } catch (exportError) {
      const message = exportError instanceof Error ? exportError.message : String(exportError)
      const logPathMatch = message.match(/Export failed\. Log: (.+)\n/)

      const errorEntry: ExportHistoryEntry = {
        id: createHistoryId(),
        timestamp: new Date().toISOString(),
        status: 'error',
        mxfPath: request.mxfPath,
        wavPath: request.wavPath,
        logPath: logPathMatch?.[1]?.trim(),
        errorMessage: message,
        detectedWavType: request.metadata?.detectedWavType,
        selectedWavType: request.metadata?.selectedWavType,
        manualSelectionApplied: request.metadata?.manualSelectionApplied,
        classificationReason: request.metadata?.classificationReason,
        mappingCount: request.mapping.length,
      }

      await appendExportHistory(getActiveHistoryPath(), errorEntry)
      throw exportError
    }
  }))
}
