import type { Ref } from 'vue'

import type { AudioMappingEntry, WavType } from '../../shared/types'

export interface UseFileAnalysisStateOptions {
  isExporting: Ref<boolean>
}

export interface UseWorkflowStateOptions {
  allChecksOk: Ref<boolean>
  canExport: Ref<boolean>
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
  exportDurationLabel: Ref<string | undefined>
  exportLogPath: Ref<string | undefined>
  exportMessage: Ref<string | undefined>
  filenameDialogDraft: Ref<string>
  isExporting: Ref<boolean>
  mapping: Ref<AudioMappingEntry[]>
  mxfPath: Ref<string | undefined>
  reason: Ref<string | undefined>
  resetForNewExport: () => void
  showExportDialog: Ref<boolean>
  showFilenameDialog: Ref<boolean>
  wavPath: Ref<string | undefined>
  wavType: Ref<WavType | undefined>
}

export interface UseWizardControllerOptions {
  canContinue: Ref<boolean>
  canExport: Ref<boolean>
  continueWorkflowStep: () => boolean
  dialogStep: Ref<'checks' | 'mapping'>
  exportMessage: Ref<string | undefined>
  filenameDialogDraft: Ref<string>
  isExporting: Ref<boolean>
  isWorkflowWindow: Ref<boolean>
  mxfPath: Ref<string | undefined>
  openWorkflowChecks: () => void
  proceedWithExport: () => Promise<void>
  resetAnalysisState: () => void
  resetForNewExport: () => void
  resetWorkflowState: () => void
  showChecksDialog: Ref<boolean>
  showExportDialog: Ref<boolean>
  showFilenameDialog: Ref<boolean>
  wavPath: Ref<string | undefined>
}