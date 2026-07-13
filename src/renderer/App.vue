<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { useExportDialogState } from './composables/useExportDialogState'
import { useFileAnalysisState } from './composables/useFileAnalysisState'
import { useExportExecution } from './composables/useExportExecution'
import { useWorkflowState } from './composables/useWorkflowState'
import { useWizardController } from './composables/useWizardController'
import DropZone from './components/DropZone.vue'
import ExportFilenameDialog from './components/ExportFilenameDialog.vue'
import ExportResultDialog from './components/ExportResultDialog.vue'
import ExportRunningDialog from './components/ExportRunningDialog.vue'
import WorkflowChecksPage from './components/WorkflowChecksPage.vue'
import WorkflowMappingPage from './components/WorkflowMappingPage.vue'

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
const isWorkflowWindow = computed(() => {
  if (typeof window === 'undefined') {
    return false
  }

  return new URLSearchParams(window.location.search).get('window') === 'workflow'
})

// Analysis/check state: everything related to file validation and mapping preparation.
const {
  allChecksOk,
  bridgeAvailable,
  canExport,
  detectedWavType,
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
  wavAnalysisError,
  wavAnalysisState,
  wavPath,
  wavPcmCheckState,
  wavType,
} = useFileAnalysisState({
  isExporting,
})

const {
  canContinue,
  continueWorkflowStep,
  dialogDescription,
  dialogStep,
  dialogTitle,
  openWorkflowChecks,
  resetWorkflowState,
  showChecksDialog,
} = useWorkflowState({
  allChecksOk,
  canExport,
})

// Export dialog state: progress, logs and copy actions.
const {
  exportMessage,
  exportProgressPercent,
  exportProgressDetails,
  exportDurationLabel,
  exportLogPath,
  logOpenStatus,
  exportDialogTitle,
  openExportLog,
  resetForNewExport,
} = useExportDialogState({
  isExporting,
  error,
  bridgeAvailable,
})

// Export execution: the actual IPC call that starts backend export processing.
const { proceedWithExport } = useExportExecution({
  canExport,
  detectedWavType,
  error,
  exportDurationLabel,
  exportLogPath,
  exportMessage,
  filenameDialogDraft,
  isExporting,
  mapping,
  mxfPath,
  reason,
  resetForNewExport,
  showExportDialog,
  showFilenameDialog,
  wavPath,
  wavType,
})

const {
  cancelChecksDialog,
  cancelFilenameDialog,
  clearWorkspace,
  closeExportDialog,
  continueWorkflow,
  handleWorkflowKeydown,
  onFilesDropped,
} = useWizardController({
  canContinue,
  canExport,
  continueWorkflowStep,
  dialogStep,
  exportMessage,
  filenameDialogDraft,
  isExporting,
  isWorkflowWindow,
  mxfPath,
  openWorkflowChecks,
  proceedWithExport,
  resetAnalysisState,
  resetForNewExport,
  resetWorkflowState,
  showChecksDialog,
  showExportDialog,
  showFilenameDialog,
  wavPath,
})

async function handleFilesDropped(payload: { mxfPath?: string; wavPath?: string }): Promise<void> {
  await onFilesDropped(analyzeDroppedFiles, payload, bridgeAvailable)
}

onMounted(async () => {
  window.addEventListener('keydown', handleWorkflowKeydown)

  if (!isWorkflowWindow.value || !bridgeAvailable) {
    return
  }

  const startPayload = await window.eventPipe.getWorkflowStartPayload()
  if (startPayload?.mxfPath || startPayload?.wavPath) {
    await handleFilesDropped(startPayload)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWorkflowKeydown)
})

</script>

<template>
  <main class="app-shell" :class="{ 'app-shell--workflow': isWorkflowWindow }">
    <section class="workspace" :class="{ 'workspace--workflow': isWorkflowWindow }">
      <section v-if="!bridgeAvailable" class="panel">
        <h3>Desktop-Bridge fehlt</h3>
        <p>
          Diese Ansicht laeuft ohne Electron-Preload-Bridge. Bitte nutzen Sie das mit `npm run dev` gestartete
          Electron-Fenster und keinen normalen Browser-Tab.
        </p>
      </section>

      <DropZone
        v-if="!isWorkflowWindow"
        :mxf-path="mxfPath"
        :wav-path="wavPath"
        @files-dropped="handleFilesDropped"
        @clear="clearWorkspace"
      />

      <WorkflowChecksPage
        v-if="isWorkflowWindow && showChecksDialog && dialogStep === 'checks'"
        :dialog-title="dialogTitle"
        :dialog-description="dialogDescription"
        :can-continue="canContinue"
        :wav-type="wavType"
        :mxf-analysis-state="mxfAnalysisState"
        :wav-analysis-state="wavAnalysisState"
        :mxf-analysis-error="mxfAnalysisError"
        :wav-analysis-error="wavAnalysisError"
        :wav-pcm-check-state="wavPcmCheckState"
        :duration-check-state="durationCheckState"
        :duration-check-message="durationCheckMessage"
        :error="error"
        @cancel="cancelChecksDialog"
        @continue="continueWorkflow"
      />

      <WorkflowMappingPage
        v-if="isWorkflowWindow && showChecksDialog && dialogStep === 'mapping'"
        :dialog-title="dialogTitle"
        :can-export="canExport"
        :mapping="mapping"
        :wav-type="wavType"
        @cancel="cancelChecksDialog"
        @continue="continueWorkflow"
      />

      <ExportRunningDialog
        v-if="isWorkflowWindow && showExportDialog && isExporting"
        :progress-percent="exportProgressPercent"
        :progress-details="exportProgressDetails"
      />

      <ExportResultDialog
        v-else-if="isWorkflowWindow && showExportDialog"
        :title="exportDialogTitle"
        :error="error"
        :export-message="exportMessage"
        :export-duration-label="exportDurationLabel"
        :export-log-path="exportLogPath"
        :log-open-status="logOpenStatus"
        @open-log="openExportLog"
        @close="closeExportDialog"
      />

      <ExportFilenameDialog
        v-if="isWorkflowWindow && showFilenameDialog"
        v-model="filenameDialogDraft"
        @cancel="cancelFilenameDialog"
        @confirm="proceedWithExport"
      />
    </section>
  </main>
</template>
