import type {
  AnalyzeMxfResult,
  AnalyzeWavResult,
  EventPipeSettings,
  ExportHistoryEntry,
  ExportJobRequest,
  ExportJobResult,
  ExportProgressUpdate,
  SettingsSnapshot,
} from '../shared/types'

declare global {
  interface Window {
    eventPipe: {
      analyzeMxf: (mxfPath: string) => Promise<AnalyzeMxfResult>
      analyzeWav: (wavPath: string) => Promise<AnalyzeWavResult>
      exportJob: (request: ExportJobRequest) => Promise<ExportJobResult>
      getSettings: () => Promise<SettingsSnapshot>
      saveSettings: (settings: Partial<EventPipeSettings>) => Promise<SettingsSnapshot>
      getExportHistory: (limit?: number) => Promise<ExportHistoryEntry[]>
      pickDirectory: (initialPath?: string) => Promise<string | undefined>
      onExportProgress: (listener: (update: ExportProgressUpdate) => void) => () => void
      getPathForFile: (file: File) => string
    }
  }
}

export {}
