import type { UseExportExecutionOptions } from './types'

export function useExportExecution(options: UseExportExecutionOptions) {
  const {
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
  } = options

  function getEventPipeApi() {
    if (!window.eventPipe) {
      throw new Error(
        'Electron bridge unavailable: window.eventPipe is not defined. Start the app as Electron desktop app (not browser-only).',
      )
    }

    return window.eventPipe
  }

  function formatDuration(durationMs: number): string {
    const totalSeconds = Math.max(0, Math.round(durationMs / 1000))

    if (totalSeconds < 60) {
      return `${totalSeconds} s`
    }

    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes} min ${seconds.toString().padStart(2, '0')} s`
  }

  async function proceedWithExport(): Promise<void> {
    // Guard against accidental calls while prerequisites are not fulfilled.
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
    const startedAtMs = Date.now()

    try {
      const eventPipe = getEventPipeApi()
      // Send only plain serializable mapping data through IPC.
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
          // Metadata is persisted to export history for traceability.
          detectedWavType: detectedWavType.value,
          selectedWavType: wavType.value,
          classificationReason: reason.value,
        },
      })

      isExporting.value = false
      exportMessage.value = `Export erfolgreich: ${result.outputPath}`
      exportLogPath.value = result.logPath
      exportDurationLabel.value = formatDuration(Date.now() - startedAtMs)
    } catch (exportError) {
      isExporting.value = false
      exportMessage.value = undefined
      const message = exportError instanceof Error ? exportError.message : 'Export failed.'
      error.value = message
      exportDurationLabel.value = formatDuration(Date.now() - startedAtMs)
    }
  }

  return {
    proceedWithExport,
  }
}
