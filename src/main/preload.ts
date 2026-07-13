import { contextBridge, ipcRenderer, webUtils } from 'electron'

import type {
  AnalyzeMxfResult,
  AnalyzeWavResult,
  ExportJobRequest,
  ExportJobResult,
  ExportHistoryEntry,
  ExportProgressUpdate,
  EventPipeSettings,
  SettingsSnapshot,
} from '../shared/types'

const api = {
  analyzeMxf: (mxfPath: string): Promise<AnalyzeMxfResult> => ipcRenderer.invoke('eventpipe:analyze-mxf', mxfPath),
  analyzeWav: (wavPath: string): Promise<AnalyzeWavResult> => ipcRenderer.invoke('eventpipe:analyze-wav', wavPath),
  exportJob: (request: ExportJobRequest): Promise<ExportJobResult> => ipcRenderer.invoke('eventpipe:export-job', request),
  getSettings: (): Promise<SettingsSnapshot> => ipcRenderer.invoke('eventpipe:get-settings'),
  saveSettings: (settings: Partial<EventPipeSettings>): Promise<SettingsSnapshot> =>
    ipcRenderer.invoke('eventpipe:save-settings', settings),
  getExportHistory: (limit?: number): Promise<ExportHistoryEntry[]> =>
    ipcRenderer.invoke('eventpipe:get-export-history', limit),
  openWorkflowWindow: (payload?: { mxfPath?: string; wavPath?: string }): Promise<boolean> =>
    ipcRenderer.invoke('eventpipe:open-workflow-window', payload),
  getWorkflowStartPayload: (): Promise<{ mxfPath?: string; wavPath?: string } | undefined> =>
    ipcRenderer.invoke('eventpipe:get-workflow-start-payload'),
  pickDirectory: (initialPath?: string): Promise<string | undefined> =>
    ipcRenderer.invoke('eventpipe:pick-directory', initialPath),
  openPath: (targetPath: string): Promise<boolean> => ipcRenderer.invoke('eventpipe:open-path', targetPath),
  onExportProgress: (listener: (update: ExportProgressUpdate) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, update: ExportProgressUpdate) => {
      listener(update)
    }
    ipcRenderer.on('eventpipe:export-progress', handler)
    return () => ipcRenderer.off('eventpipe:export-progress', handler)
  },
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),
}

contextBridge.exposeInMainWorld('eventPipe', api)
