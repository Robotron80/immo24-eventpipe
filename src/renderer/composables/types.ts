import type { Ref } from 'vue'

import type { AudioMappingEntry, ExportHistoryEntry, WavType } from '../../shared/types'

export interface UseAnalysisChecksStateOptions {
  isExporting: Ref<boolean>
}

export interface UseExportDialogStateOptions {
  isExporting: Ref<boolean>
  error: Ref<string | undefined>
  bridgeAvailable: boolean
}

export interface UseExportExecutionOptions {
  canExport: Ref<boolean>
  detectedWavType: Ref<WavType | undefined>
  error: Ref<string | undefined>
  exportDetails: Ref<string | undefined>
  exportLogPath: Ref<string | undefined>
  exportMessage: Ref<string | undefined>
  filenameDialogDraft: Ref<string>
  isExporting: Ref<boolean>
  mapping: Ref<AudioMappingEntry[]>
  mxfPath: Ref<string | undefined>
  reason: Ref<string | undefined>
  recentExportHistory: Ref<ExportHistoryEntry[]>
  resetForNewExport: () => void
  showExportDialog: Ref<boolean>
  showFilenameDialog: Ref<boolean>
  wavPath: Ref<string | undefined>
  wavType: Ref<WavType | undefined>
}