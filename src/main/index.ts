import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, dialog, ipcMain, Menu, type OpenDialogOptions } from 'electron'
import settingsHtml from './settings.html?raw'
import splashHtml from './splash.html?raw'

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
import { appendExportHistory, getExportHistoryPath, readExportHistory } from './historyService'
import { writeLog } from './logService'
import {
  DEFAULT_SETTINGS,
  getConfigPath,
  hasSettingsFile,
  loadSettings,
  saveSettings,
} from './settingsService'

let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let splashShownAt = 0
let activeSettings: EventPipeSettings = { ...DEFAULT_SETTINGS }
let activeConfigPath = ''
let activeHistoryPath = ''
let shouldOpenSettingsOnStartup = false
const cliDebugLoggingEnabled =
  process.argv.includes('--debug-logging') ||
  ['1', 'true', 'yes', 'on'].includes((process.env.EVENTPIPE_DEBUG_LOGGING || '').toLowerCase())
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
}

function withRuntimeDebugLogging(settings: EventPipeSettings): EventPipeSettings {
  // CLI/env debug flags override persisted config for this launch only.
  return {
    ...settings,
    debugLoggingEnabled: cliDebugLoggingEnabled,
  }
}

function debugLog(message: string, context?: Record<string, unknown>): void {
  if (!activeSettings.debugLoggingEnabled) {
    return
  }

  writeLog({
    level: 'info',
    message,
    context,
  })
}

function resolveSplashIconDataUrl(): string {
  // Splash is delivered as inline HTML, so image data is injected as base64 URL.
  const appPath = app.getAppPath()
  const candidates = [
    path.resolve(appPath, 'src/assets/icon.png'),
    path.resolve(appPath, 'dist/assets/icon.png'),
  ]

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) {
      continue
    }

    const encoded = fs.readFileSync(filePath).toString('base64')
    return `data:image/png;base64,${encoded}`
  }

  return ''
}

function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 250,
    frame: false,
    transparent: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    movable: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  })

  const resolvedSplashHtml = splashHtml.replace('__SPLASH_ICON_SRC__', resolveSplashIconDataUrl())
  splashWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(resolvedSplashHtml)}`)
  splashWindow.once('ready-to-show', () => {
    splashShownAt = Date.now()
    splashWindow?.show()
  })
}

function openSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }

  const parent = mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() ? mainWindow : undefined

  settingsWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 780,
    minHeight: 560,
    resizable: true,
    title: 'Konfiguration',
    parent,
    modal: Boolean(parent),
    show: false,
    backgroundColor: '#f5f5f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  settingsWindow.setMenu(null)
  settingsWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(settingsHtml)}`)
  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show()
  })
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

async function ensureMinimumSplashDuration(minimumMs = 2000): Promise<void> {
  if (splashShownAt === 0) {
    return
  }

  const elapsed = Date.now() - splashShownAt
  const remaining = minimumMs - elapsed

  if (remaining <= 0) {
    return
  }

  await new Promise((resolve) => setTimeout(resolve, remaining))
}

function createApplicationMenu(): void {
  const isMac = process.platform === 'darwin'
  const isDevMode = Boolean(process.env.VITE_DEV_SERVER_URL)
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' }, { type: 'separator' },
        { label: 'Konfiguration', accelerator: 'CommandOrControl+,', click: openSettingsWindow },
        { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : [{
      label: 'Datei',
      submenu: [
        { label: 'Konfiguration', accelerator: 'CommandOrControl+,', click: openSettingsWindow },
        { type: 'separator' }, { role: 'quit' }
      ]
    }]),
    {
      label: 'Bearbeiten',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          { label: 'Sprachausgabe', submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }] }
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },
    ...(isDevMode ? [{
      // Keep debug actions visible only while running in development mode.
      label: 'Entwickler',
      submenu: [
        { role: 'toggleDevTools' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleFullScreen' }
      ]
    }] : [])
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template as any))
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 500,
    minWidth: 320,
    minHeight: 320,
    show: false,
    backgroundColor: '#f5f5f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../index.html'))
  }

  mainWindow.setAspectRatio(1)

  mainWindow.webContents.once('did-finish-load', async () => {
    // Prevent fast startup flicker by enforcing a minimal splash display time.
    await ensureMinimumSplashDuration(2000)
    splashWindow?.close()
    splashWindow = null
    mainWindow?.show()

    if (shouldOpenSettingsOnStartup) {
      openSettingsWindow()
      shouldOpenSettingsOnStartup = false
    }
  })
}

app.whenReady().then(() => {
  // Startup order: load settings, create windows, register IPC handlers.
  app.setName('immo24 EventPipe')

  activeConfigPath = getConfigPath()
  activeHistoryPath = getExportHistoryPath(activeConfigPath)

  return hasSettingsFile(activeConfigPath).then(async (hasConfigFile) => {
    shouldOpenSettingsOnStartup = !hasConfigFile
    activeSettings = withRuntimeDebugLogging(
      hasConfigFile ? await loadSettings(activeConfigPath) : { ...DEFAULT_SETTINGS },
    )

    createSplashWindow()
    createApplicationMenu()

    ipcMain.handle('eventpipe:get-settings', () => {
      return {
        settings: activeSettings,
        configPath: activeConfigPath,
      }
    })

    ipcMain.handle('eventpipe:get-export-history', async (_event, limit?: number) => {
      const safeLimit = Math.max(1, Math.min(100, typeof limit === 'number' ? Math.floor(limit) : 20))
      return readExportHistory(activeHistoryPath, safeLimit)
    })

    ipcMain.handle('eventpipe:pick-directory', async (_event, initialPath?: string) => {
      const ownerWindow = settingsWindow && !settingsWindow.isDestroyed() ? settingsWindow : mainWindow ?? undefined
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
    })

    ipcMain.handle('eventpipe:save-settings', async (_event, input: Partial<EventPipeSettings>) => {
      const merged = {
        ...activeSettings,
        ...input,
      }

      const saved = await saveSettings(activeConfigPath, merged)
      activeSettings = withRuntimeDebugLogging(saved)
      debugLog('Settings saved', { configPath: activeConfigPath })

      return {
        settings: activeSettings,
        configPath: activeConfigPath,
      }
    })

    ipcMain.handle('eventpipe:analyze-mxf', async (_event, mxfPath: string): Promise<AnalyzeMxfResult> => {
      debugLog('Analyze MXF requested', { mxfPath })
      const probe = await analyzeMxfWithFfprobe(mxfPath, activeSettings.ffprobePath)
      return { probe }
    })

    ipcMain.handle('eventpipe:analyze-wav', async (_event, wavPath: string): Promise<AnalyzeWavResult> => {
      debugLog('Analyze WAV requested', { wavPath })
      const probe = await analyzeWavWithFfprobe(wavPath, activeSettings.ffprobePath)
      const classification = classifyWav(probe)

      if (!isSupportedChannelCount(probe.channels)) {
        throw new Error(`Unsupported channel count ${probe.channels}. Allowed: 2, 4, 6, 8.`)
      }

      const mapping =
        classification.type === 'legacy-surround-print'
          ? buildLegacyMapping(probe.channels)
          : buildBounceMapping(probe.channels, classification.trackNames)

      return {
        probe,
        classification,
        mapping,
      }
    })

    ipcMain.handle('eventpipe:export-job', async (event, request: ExportJobRequest): Promise<ExportJobResult> => {
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
        const result = await exportMxfWithMappedAudio(request, activeSettings, (update) => {
          event.sender.send('eventpipe:export-progress', update)
        })

        const successEntry: ExportHistoryEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
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

        await appendExportHistory(activeHistoryPath, successEntry)

        event.sender.send('eventpipe:export-progress', {
          percent: 100,
        })

        return result
      } catch (exportError) {
        const message = exportError instanceof Error ? exportError.message : String(exportError)
        const logPathMatch = message.match(/Export failed\. Log: (.+)\n/)

        const errorEntry: ExportHistoryEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
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

        await appendExportHistory(activeHistoryPath, errorEntry)
        throw exportError
      }
    })

    createMainWindow()

    app.on('second-instance', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore()
        }
        mainWindow.focus()
        return
      }

      createMainWindow()
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow()
      }
    })
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
