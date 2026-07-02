import { computed, onBeforeUnmount, ref } from 'vue'

import type { ExportHistoryEntry } from '../../shared/types'
import type { UseExportDialogStateOptions } from './types'

export type CopyState = 'idle' | 'copied' | 'error'

export function useExportDialogState(options: UseExportDialogStateOptions) {
  const { isExporting, error, bridgeAvailable } = options

  const exportMessage = ref<string>()
  const exportProgressPercent = ref<number>()
  const exportProgressDetails = ref<string>()
  const exportLogPath = ref<string>()
  const exportDetails = ref<string>()
  const copyLogStatus = ref<CopyState>('idle')
  const copyDetailsStatus = ref<CopyState>('idle')
  const recentExportHistory = ref<ExportHistoryEntry[]>([])

  const exportDialogTitle = computed(() => {
    if (isExporting.value) {
      return 'Export läuft'
    }

    return error.value ? 'Export fehlgeschlagen' : 'Export abgeschlossen'
  })

  function resetForNewExport(): void {
    error.value = undefined
    exportMessage.value = undefined
    exportProgressPercent.value = undefined
    exportProgressDetails.value = 'Starting ffmpeg...'
    exportLogPath.value = undefined
    exportDetails.value = undefined
    copyLogStatus.value = 'idle'
    copyDetailsStatus.value = 'idle'
  }

  async function copyLogPath(): Promise<void> {
    if (!exportLogPath.value) {
      return
    }

    try {
      await navigator.clipboard.writeText(exportLogPath.value)
      copyLogStatus.value = 'copied'
    } catch {
      copyLogStatus.value = 'error'
    }
  }

  async function copyExportDetails(): Promise<void> {
    if (!exportDetails.value) {
      return
    }

    try {
      await navigator.clipboard.writeText(exportDetails.value)
      copyDetailsStatus.value = 'copied'
    } catch {
      copyDetailsStatus.value = 'error'
    }
  }

  const unsubscribeExportProgress =
    bridgeAvailable && window.eventPipe.onExportProgress
      ? window.eventPipe.onExportProgress((update) => {
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
    copyDetailsStatus,
    copyExportDetails,
    copyLogPath,
    copyLogStatus,
    exportDetails,
    exportDialogTitle,
    exportLogPath,
    exportMessage,
    exportProgressDetails,
    exportProgressPercent,
    recentExportHistory,
    resetForNewExport,
  }
}
