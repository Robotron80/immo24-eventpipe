import type { UseWizardControllerOptions } from './types'

export function useWizardController(options: UseWizardControllerOptions) {
  const {
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
  } = options

  function clearWorkspace(clearExportMessage = true): void {
    resetAnalysisState()
    resetWorkflowState()
    isExporting.value = false
    showExportDialog.value = false
    showFilenameDialog.value = false
    filenameDialogDraft.value = ''
    resetForNewExport()

    if (clearExportMessage) {
      exportMessage.value = undefined
    }
  }

  async function continueWorkflow(): Promise<void> {
    if (!continueWorkflowStep()) {
      return
    }

    const sourceName = mxfPath.value
      ? decodeURIComponent(mxfPath.value.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || 'export')
      : 'export'

    filenameDialogDraft.value = sourceName || 'export'
    showChecksDialog.value = false
    showFilenameDialog.value = true
  }

  function cancelChecksDialog(): void {
    clearWorkspace(true)

    if (isWorkflowWindow.value) {
      window.close()
    }
  }

  function cancelFilenameDialog(): void {
    cancelChecksDialog()
  }

  function closeExportDialog(): void {
    if (isExporting.value) {
      return
    }

    clearWorkspace(true)

    if (isWorkflowWindow.value) {
      window.close()
    }
  }

  function handleWorkflowKeydown(event: KeyboardEvent): void {
    if (!isWorkflowWindow.value) {
      return
    }

    if (event.key === 'Escape') {
      if (isExporting.value) {
        return
      }

      if (showExportDialog.value) {
        event.preventDefault()
        closeExportDialog()
        return
      }

      if (showFilenameDialog.value || showChecksDialog.value) {
        event.preventDefault()
        cancelChecksDialog()
      }

      return
    }

    if (event.key !== 'Enter') {
      return
    }

    if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
      return
    }

    if (isExporting.value) {
      return
    }

    if (showChecksDialog.value) {
      if ((dialogStep.value === 'checks' && !canContinue.value) || (dialogStep.value === 'mapping' && !canExport.value)) {
        return
      }

      event.preventDefault()
      void continueWorkflow()
      return
    }

    if (showFilenameDialog.value) {
      if (filenameDialogDraft.value.trim().length === 0) {
        return
      }

      event.preventDefault()
      void proceedWithExport()
      return
    }

    if (showExportDialog.value) {
      event.preventDefault()
      closeExportDialog()
    }
  }

  async function onFilesDropped(
    analyzeDroppedFiles: (payload: { mxfPath?: string; wavPath?: string }) => Promise<void>,
    payload: { mxfPath?: string; wavPath?: string },
    bridgeAvailable: boolean,
  ): Promise<void> {
    exportMessage.value = undefined
    showExportDialog.value = false
    showFilenameDialog.value = false
    resetForNewExport()
    await analyzeDroppedFiles(payload)

    if (mxfPath.value && wavPath.value) {
      if (!isWorkflowWindow.value && bridgeAvailable) {
        await window.eventPipe.openWorkflowWindow({
          mxfPath: mxfPath.value,
          wavPath: wavPath.value,
        })
        clearWorkspace(true)
        return
      }

      openWorkflowChecks()
    }
  }

  return {
    cancelChecksDialog,
    cancelFilenameDialog,
    clearWorkspace,
    closeExportDialog,
    continueWorkflow,
    handleWorkflowKeydown,
    onFilesDropped,
  }
}
