import type { UseExportExecutionOptions } from './types'

export function useExportExecution(options: UseExportExecutionOptions) {
  const {
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
  } = options

  function getEventPipeApi() {
    if (!window.eventPipe) {
      throw new Error(
        'Electron bridge unavailable: window.eventPipe is not defined. Start the app as Electron desktop app (not browser-only).',
      )
    }

    return window.eventPipe
  }

  async function proceedWithExport(): Promise<void> {
    if (!canExport.value) {
      return
    }

    const customFileName = filenameDialogDraft.value.trim()
    if (!customFileName) {
      error.value = 'Dateiname darf nicht leer sein.'
      return
    }

    isExporting.value = true
    showFilenameDialog.value = false
    showExportDialog.value = true
    resetForNewExport()

    try {
      const eventPipe = getEventPipeApi()
      const plainMapping = mapping.value.map((entry) => ({
        mxfTrack: entry.mxfTrack,
        wavChannel: entry.wavChannel,
        name: entry.name,
      }))

      const result = await eventPipe.exportJob({
        mxfPath: mxfPath.value!,
        wavPath: wavPath.value!,
        mapping: plainMapping,
        customFileName,
        metadata: {
          detectedWavType: detectedWavType.value,
          selectedWavType: wavType.value,
          classificationReason: reason.value,
        },
      })

      isExporting.value = false
      exportMessage.value = `Export successful: ${result.outputPath}`
      exportLogPath.value = result.logPath
      exportDetails.value = result.log
      recentExportHistory.value = await eventPipe.getExportHistory(5)
    } catch (exportError) {
      isExporting.value = false
      exportMessage.value = undefined
      const message = exportError instanceof Error ? exportError.message : 'Export failed.'
      error.value = message
      exportDetails.value = message

      const eventPipe = getEventPipeApi()
      recentExportHistory.value = await eventPipe.getExportHistory(5)
    }
  }

  return {
    proceedWithExport,
  }
}
