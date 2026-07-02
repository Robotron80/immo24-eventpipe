<script setup lang="ts">
import { ref } from 'vue'

import { useExportDialogState } from './composables/useExportDialogState'
import { useAnalysisChecksState } from './composables/useAnalysisChecksState'
import { useExportExecution } from './composables/useExportExecution'
import DropZone from './components/DropZone.vue'
import ChecksDialog from './components/ChecksDialog.vue'
import ExportFilenameDialog from './components/ExportFilenameDialog.vue'
import ExportResultDialog from './components/ExportResultDialog.vue'
import ExportRunningDialog from './components/ExportRunningDialog.vue'

// Main UI flow in simple terms:
// 1) User drops MXF + WAV
// 2) App analyzes files and builds channel mapping
// 3) User confirms checks/mapping and picks export file name
// 4) Export starts, progress and logs are shown
// 5) Result is published to watchfolder and added to history

const isExporting = ref(false)
const showExportDialog = ref(false)
const showFilenameDialog = ref(false)
const filenameDialogDraft = ref<string>('')

const {
  bridgeAvailable,
  canContinue,
  canExport,
  continueChecksFlow,
  detectedWavType,
  dialogDescription,
  dialogPrimaryLabel,
  dialogStep,
  dialogTitle,
  durationCheckMessage,
  durationCheckState,
  error,
  mapping,
  mxfAnalysisError,
  mxfAnalysisState,
  mxfPath,
  onFilesDropped: analyzeDroppedFiles,
  reason,
  resetAnalysisState,
  showChecksDialog,
  showMappingPreviewInDialog,
  showStatusPanelInDialog,
  wavAnalysisError,
  wavAnalysisState,
  wavPath,
  wavPcmCheckState,
  wavType,
} = useAnalysisChecksState({
  isExporting,
})

const {
  exportMessage,
  exportProgressPercent,
  exportProgressDetails,
  exportLogPath,
  exportDetails,
  copyLogStatus,
  copyDetailsStatus,
  recentExportHistory,
  exportDialogTitle,
  copyLogPath,
  copyExportDetails,
  resetForNewExport,
} = useExportDialogState({
  isExporting,
  error,
  bridgeAvailable,
})

const { proceedWithExport } = useExportExecution({
  canExport,
  detectedWavType,
  error,
  exportDetails,
  exportLogPath,
  exportMessage,
  filenameDialogDraft,
  isExporting,
  mapping,
  mxfPath,
  reason,
  recentExportHistory,
  resetForNewExport,
  showExportDialog,
  showFilenameDialog,
  wavPath,
  wavType,
})

async function onFilesDropped(payload: { mxfPath?: string; wavPath?: string }): Promise<void> {
  exportMessage.value = undefined
  await analyzeDroppedFiles(payload)
}

function clearWorkspace(clearExportMessage = true): void {
  resetAnalysisState()
  isExporting.value = false
  showExportDialog.value = false
  showFilenameDialog.value = false
  filenameDialogDraft.value = ''
  resetForNewExport()
  recentExportHistory.value = []

  if (clearExportMessage) {
    exportMessage.value = undefined
  }
}

async function continueToMappingPreview(): Promise<void> {
  if (!continueChecksFlow()) {
    return
  }

  // Show filename dialog before exporting
  const sourceName = mxfPath.value 
    ? decodeURIComponent(mxfPath.value.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || 'export')
    : 'export'
  filenameDialogDraft.value = sourceName || 'export'
  showChecksDialog.value = false
  showFilenameDialog.value = true
}

function cancelChecksDialog(): void {
  clearWorkspace(true)
}

function cancelFilenameDialog(): void {
  showFilenameDialog.value = false
  showChecksDialog.value = true
}

function closeExportDialog(): void {
  if (isExporting.value) {
    return
  }

  clearWorkspace(true)
}

</script>

<template>
  <main class="app-shell">
    <section class="workspace">
      <section v-if="!bridgeAvailable" class="panel">
        <h3>Desktop Bridge Missing</h3>
        <p>
          This view is running without Electron preload bridge. Please use the Electron desktop window started by npm
          run dev, not a standalone browser tab.
        </p>
      </section>

      <DropZone :mxf-path="mxfPath" :wav-path="wavPath" @files-dropped="onFilesDropped" @clear="clearWorkspace" />

      <ChecksDialog
        v-if="showChecksDialog"
        :dialog-title="dialogTitle"
        :dialog-description="dialogDescription"
        :dialog-primary-label="dialogPrimaryLabel"
        :dialog-step="dialogStep"
        :show-status-panel-in-dialog="showStatusPanelInDialog"
        :show-mapping-preview-in-dialog="showMappingPreviewInDialog"
        :can-continue="canContinue"
        :can-export="canExport"
        :wav-type="wavType"
        :mxf-analysis-state="mxfAnalysisState"
        :wav-analysis-state="wavAnalysisState"
        :mxf-analysis-error="mxfAnalysisError"
        :wav-analysis-error="wavAnalysisError"
        :wav-pcm-check-state="wavPcmCheckState"
        :duration-check-state="durationCheckState"
        :duration-check-message="durationCheckMessage"
        :error="error"
        :mapping="mapping"
        @cancel="cancelChecksDialog"
        @continue="continueToMappingPreview"
      />

      <ExportRunningDialog
        v-if="showExportDialog && isExporting"
        :progress-percent="exportProgressPercent"
        :progress-details="exportProgressDetails"
      />

      <ExportResultDialog
        v-else-if="showExportDialog"
        :title="exportDialogTitle"
        :error="error"
        :export-message="exportMessage"
        :export-log-path="exportLogPath"
        :export-details="exportDetails"
        :copy-log-status="copyLogStatus"
        :copy-details-status="copyDetailsStatus"
        :recent-export-history="recentExportHistory"
        @copy-log-path="copyLogPath"
        @copy-export-details="copyExportDetails"
        @close="closeExportDialog"
      />

      <ExportFilenameDialog
        v-if="showFilenameDialog"
        v-model="filenameDialogDraft"
        @cancel="cancelFilenameDialog"
        @confirm="proceedWithExport"
      />
    </section>
  </main>
</template>
