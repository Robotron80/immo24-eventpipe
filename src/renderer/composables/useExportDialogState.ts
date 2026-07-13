import { computed, onBeforeUnmount, ref } from 'vue'

import type { UseExportDialogStateOptions } from './types'

export type OpenState = 'idle' | 'error'

export function useExportDialogState(options: UseExportDialogStateOptions) {
  const { isExporting, error, bridgeAvailable } = options

  const exportMessage = ref<string>()
  const exportProgressPercent = ref<number>()
  const exportProgressDetails = ref<string>()
  const exportLogPath = ref<string>()
  const exportDurationLabel = ref<string>()
  const logOpenStatus = ref<OpenState>('idle')

  // Title reflects current phase/outcome and is reused by the result dialog component.
  const exportDialogTitle = computed(() => {
    if (isExporting.value) {
      return 'Export läuft'
    }

    return error.value ? 'Export fehlgeschlagen' : 'Export abgeschlossen'
  })

  function resetForNewExport(): void {
    // Keep historical list, but clear all per-run UI artifacts.
    error.value = undefined
    exportMessage.value = undefined
    exportProgressPercent.value = undefined
    exportProgressDetails.value = 'Starting ffmpeg...'
    exportLogPath.value = undefined
    exportDurationLabel.value = undefined
    logOpenStatus.value = 'idle'
  }

  async function openExportLog(): Promise<void> {
    if (!bridgeAvailable || !exportLogPath.value) {
      return
    }

    try {
      const opened = await window.eventPipe.openPath(exportLogPath.value)
      logOpenStatus.value = opened ? 'idle' : 'error'
    } catch {
      logOpenStatus.value = 'error'
    }
  }

  const unsubscribeExportProgress =
    bridgeAvailable && window.eventPipe.onExportProgress
      ? window.eventPipe.onExportProgress((update) => {
          // Backend sends partial progress events; we normalize for compact UI display.
          if (typeof update.percent === 'number') {
            exportProgressPercent.value = update.percent
          }

          const details = [
            update.timecode ? `time ${update.timecode}` : undefined,
            update.speed ? `speed ${update.speed}` : undefined,
          ]
            .filter(Boolean)
            .join(' | ')

          exportProgressDetails.value = details || undefined
        })
      : undefined

  onBeforeUnmount(() => {
    unsubscribeExportProgress?.()
  })

  return {
    exportDialogTitle,
    exportDurationLabel,
    exportLogPath,
    exportMessage,
    logOpenStatus,
    openExportLog,
    exportProgressDetails,
    exportProgressPercent,
    resetForNewExport,
  }
}
