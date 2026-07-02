import { computed, ref } from 'vue'

import type { AudioMappingEntry, WavType } from '../../shared/types'
import type { UseAnalysisChecksStateOptions } from './types'

export function useAnalysisChecksState(options: UseAnalysisChecksStateOptions) {
  const { isExporting } = options

  const durationToleranceSeconds = 0.2

  const showChecksDialog = ref(false)
  const dialogStep = ref<'checks' | 'mapping'>('checks')

  const mxfAnalysisState = ref<'idle' | 'ok' | 'error'>('idle')
  const wavAnalysisState = ref<'idle' | 'running' | 'ok' | 'error'>('idle')
  const mxfPath = ref<string>()
  const wavPath = ref<string>()
  const wavType = ref<WavType>()
  const mxfDurationSeconds = ref<number>()
  const detectedWavType = ref<WavType>()
  const wavChannelLayout = ref<string>()
  const channels = ref<number>()
  const wavDurationSeconds = ref<number>()
  const wavCodecName = ref<string>()
  const trackNames = ref<string[]>([])
  const reason = ref<string>()
  const error = ref<string>()
  const mxfAnalysisError = ref<string>()
  const wavAnalysisError = ref<string>()
  const mapping = ref<AudioMappingEntry[]>([])

  const bridgeAvailable = typeof window !== 'undefined' && typeof window.eventPipe !== 'undefined'

  function getEventPipeApi() {
    if (!window.eventPipe) {
      throw new Error(
        'Electron bridge unavailable: window.eventPipe is not defined. Start the app as Electron desktop app (not browser-only).',
      )
    }

    return window.eventPipe
  }

  function parseChannelLayoutNames(layout?: string): string[] {
    if (!layout) {
      return []
    }

    const names = layout
      .split(/[\s,\/|]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0 && /[a-z]/i.test(token))

    if (names.length === 1 && ['stereo', 'mono', 'quad', '5.1', '7.1'].includes(names[0].toLowerCase())) {
      return []
    }

    return names
  }

  function fallbackLegacyChannelNames(channelCount: number): string[] {
    if (channelCount === 2) {
      return ['L', 'R']
    }

    if (channelCount === 4) {
      return ['L', 'R', 'Ls', 'Rs']
    }

    if (channelCount === 6) {
      return ['L', 'R', 'C', 'LFE', 'Ls', 'Rs']
    }

    if (channelCount === 8) {
      return ['L', 'R', 'C', 'LFE', 'Lb', 'Rb', 'Ls', 'Rs']
    }

    return []
  }

  function withLegacyChannelNames(entries: AudioMappingEntry[], layout?: string): AudioMappingEntry[] {
    const maxWavChannel = entries.reduce((max, entry) => Math.max(max, entry.wavChannel), 0)
    const parsedNames = parseChannelLayoutNames(layout)
    const channelNames = parsedNames.length >= maxWavChannel ? parsedNames : fallbackLegacyChannelNames(maxWavChannel)

    if (channelNames.length === 0) {
      return entries
    }

    return entries.map((entry) => ({
      ...entry,
      name: channelNames[entry.wavChannel - 1] ?? entry.name,
    }))
  }

  async function applyMxf(path: string): Promise<void> {
    mxfPath.value = path
    error.value = undefined
    mxfAnalysisError.value = undefined
    mxfAnalysisState.value = 'idle'

    try {
      const eventPipe = getEventPipeApi()
      const analysis = await eventPipe.analyzeMxf(path)
      mxfDurationSeconds.value = analysis.probe.durationSeconds
      mxfAnalysisState.value = 'ok'
    } catch (analysisError) {
      const message = analysisError instanceof Error ? analysisError.message : 'Unknown MXF analysis error'
      error.value = message
      mxfAnalysisError.value = message
      mxfDurationSeconds.value = undefined
      mxfAnalysisState.value = 'error'
    }
  }

  async function applyWav(path: string): Promise<void> {
    wavAnalysisState.value = 'running'
    wavPath.value = path
    error.value = undefined
    wavAnalysisError.value = undefined

    try {
      const eventPipe = getEventPipeApi()
      const analysis = await eventPipe.analyzeWav(path)
      wavType.value = analysis.classification.type
      detectedWavType.value = analysis.classification.type
      wavChannelLayout.value = analysis.probe.channelLayout
      channels.value = analysis.probe.channels
      wavDurationSeconds.value = analysis.probe.durationSeconds
      wavCodecName.value = analysis.probe.codecName
      trackNames.value = analysis.classification.trackNames
      reason.value = analysis.classification.reason
      mapping.value =
        analysis.classification.type === 'legacy-surround-print'
          ? withLegacyChannelNames(analysis.mapping, analysis.probe.channelLayout)
          : analysis.mapping
      wavAnalysisState.value = 'ok'
    } catch (analysisError) {
      const message = analysisError instanceof Error ? analysisError.message : 'Unknown analysis error'
      error.value = message
      wavAnalysisError.value = message
      wavType.value = undefined
      detectedWavType.value = undefined
      wavChannelLayout.value = undefined
      channels.value = undefined
      wavDurationSeconds.value = undefined
      wavCodecName.value = undefined
      trackNames.value = []
      reason.value = undefined
      mapping.value = []
      wavAnalysisState.value = 'error'
    }
  }

  const durationDeltaSeconds = computed(() => {
    if (typeof mxfDurationSeconds.value !== 'number' || typeof wavDurationSeconds.value !== 'number') {
      return undefined
    }

    return Math.abs(mxfDurationSeconds.value - wavDurationSeconds.value)
  })

  const durationCheckState = computed<'ok' | 'warn' | 'unknown'>(() => {
    if (typeof durationDeltaSeconds.value !== 'number') {
      return 'unknown'
    }

    return durationDeltaSeconds.value <= durationToleranceSeconds ? 'ok' : 'warn'
  })

  const wavPcmCheckState = computed<'ok' | 'warn' | 'unknown'>(() => {
    if (wavAnalysisState.value !== 'ok') {
      return 'unknown'
    }

    if (!wavCodecName.value) {
      return 'warn'
    }

    return wavCodecName.value.toLowerCase().startsWith('pcm') ? 'ok' : 'warn'
  })

  const hasBlockingCheckError = computed(() => {
    return (
      mxfAnalysisState.value === 'error' ||
      wavAnalysisState.value === 'error' ||
      durationCheckState.value !== 'ok'
    )
  })

  const canExport = computed(() => {
    return Boolean(
      mxfPath.value &&
        wavPath.value &&
        mapping.value.length > 0 &&
        !error.value &&
        !hasBlockingCheckError.value &&
        !isExporting.value,
    )
  })

  const canContinue = computed(() => {
    return canExport.value
  })

  const allChecksOk = computed(() => {
    return Boolean(
      mxfAnalysisState.value === 'ok' &&
        wavAnalysisState.value === 'ok' &&
        wavPcmCheckState.value === 'ok' &&
        durationCheckState.value === 'ok' &&
        wavType.value &&
        wavType.value !== 'unknown' &&
        mapping.value.length > 0 &&
        !error.value,
    )
  })

  const showStatusPanelInDialog = computed(() => {
    return dialogStep.value === 'checks'
  })

  const showMappingPreviewInDialog = computed(() => {
    return dialogStep.value === 'mapping'
  })

  const dialogTitle = computed(() => {
    return dialogStep.value === 'checks' ? 'Status and Checks' : 'Mapping Preview'
  })

  const dialogDescription = computed(() => {
    return dialogStep.value === 'checks'
      ? 'Bitte Pruefung bestaetigen, bevor die Mapping-Preview und der Export starten.'
      : 'Bitte Mapping pruefen und Export starten.'
  })

  const dialogPrimaryLabel = computed(() => {
    return dialogStep.value === 'checks' ? 'Weiter' : 'Export starten'
  })

  const durationCheckMessage = computed(() => {
    if (durationCheckState.value === 'unknown') {
      return '-'
    }

    if (durationCheckState.value === 'ok') {
      return 'OK'
    }

    if (typeof mxfDurationSeconds.value !== 'number' || typeof wavDurationSeconds.value !== 'number') {
      return 'Warning'
    }

    const delta = Math.abs(mxfDurationSeconds.value - wavDurationSeconds.value).toFixed(3)
    const longer = mxfDurationSeconds.value > wavDurationSeconds.value ? 'MXF is longer' : 'WAV is longer'
    return `Warning (${longer} by ${delta} s)`
  })

  async function onFilesDropped(payload: { mxfPath?: string; wavPath?: string }): Promise<void> {
    if (!bridgeAvailable) {
      error.value = 'Desktop bridge missing. Open and use the Electron app window.'
      return
    }

    if (payload.mxfPath) {
      await applyMxf(payload.mxfPath)
    }

    if (payload.wavPath) {
      await applyWav(payload.wavPath)
    }

    if (!payload.wavPath && wavPath.value && wavAnalysisState.value !== 'ok') {
      await applyWav(wavPath.value)
    }

    if (mxfPath.value && wavPath.value) {
      dialogStep.value = allChecksOk.value ? 'mapping' : 'checks'
      showChecksDialog.value = true
    }
  }

  function continueChecksFlow(): boolean {
    if (dialogStep.value === 'checks') {
      if (!canContinue.value) {
        return false
      }

      dialogStep.value = 'mapping'
      return false
    }

    return true
  }

  function resetAnalysisState(): void {
    mxfPath.value = undefined
    wavPath.value = undefined
    mxfAnalysisState.value = 'idle'
    wavAnalysisState.value = 'idle'
    wavType.value = undefined
    mxfDurationSeconds.value = undefined
    detectedWavType.value = undefined
    wavChannelLayout.value = undefined
    channels.value = undefined
    wavDurationSeconds.value = undefined
    wavCodecName.value = undefined
    trackNames.value = []
    reason.value = undefined
    error.value = undefined
    mxfAnalysisError.value = undefined
    wavAnalysisError.value = undefined
    mapping.value = []
    showChecksDialog.value = false
    dialogStep.value = 'checks'
  }

  return {
    allChecksOk,
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
    onFilesDropped,
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
  }
}
