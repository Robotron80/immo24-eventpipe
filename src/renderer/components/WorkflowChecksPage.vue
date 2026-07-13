<script setup lang="ts">
import type { WavType } from '../../shared/types'

const props = defineProps<{
  dialogTitle: string
  dialogDescription: string
  canContinue: boolean
  wavType?: WavType
  mxfAnalysisState?: 'idle' | 'ok' | 'error'
  wavAnalysisState?: 'idle' | 'running' | 'ok' | 'error'
  mxfAnalysisError?: string
  wavAnalysisError?: string
  wavPcmCheckState?: 'ok' | 'warn' | 'unknown'
  durationCheckState?: 'ok' | 'warn' | 'unknown'
  durationCheckMessage?: string
  error?: string
}>()

const emit = defineEmits<{
  (event: 'cancel'): void
  (event: 'continue'): void
}>()

type CheckStatus = 'ok' | 'failed'

function formatWavTypeLabel(type?: WavType): string {
  if (!type || type === 'unknown') {
    return '-'
  }

  if (type === 'legacy-surround-track') {
    return 'Legacy Surround Track'
  }

  if (type === 'multitrack-wav') {
    return 'Multitrack WAV'
  }

  return type
}

function mxfCheckStatus(): CheckStatus {
  return props.mxfAnalysisState === 'ok' ? 'ok' : 'failed'
}

function mxfCheckMessage(): string {
  if (props.mxfAnalysisState === 'ok') {
    return 'OK'
  }

  if (props.mxfAnalysisState === 'error') {
    return `Fehlgeschlagen${props.mxfAnalysisError ? ` (${props.mxfAnalysisError})` : ''}`
  }

  return 'Nicht geprueft'
}

function wavCheckStatus(): CheckStatus {
  return props.wavAnalysisState === 'ok' && props.wavPcmCheckState === 'ok' ? 'ok' : 'failed'
}

function wavCheckMessage(): string {
  if (props.wavAnalysisState === 'ok') {
    return props.wavPcmCheckState === 'ok' ? 'OK' : 'Codec ist nicht PCM'
  }

  if (props.wavAnalysisState === 'running') {
    return 'Laeuft'
  }

  if (props.wavAnalysisState === 'error') {
    return `Fehlgeschlagen${props.wavAnalysisError ? ` (${props.wavAnalysisError})` : ''}`
  }

  return 'Nicht geprueft'
}

function wavTypeCheckStatus(): CheckStatus {
  return props.wavType && props.wavType !== 'unknown' ? 'ok' : 'failed'
}

function durationCheckStatusLabel(): CheckStatus {
  return props.durationCheckState === 'ok' ? 'ok' : 'failed'
}

function genericErrorStatus(): CheckStatus {
  return 'failed'
}

function statusIcon(status: CheckStatus): string {
  return status === 'ok' ? '✓' : ''
}
</script>

<template>
  <section class="overlay">
    <div class="dialog dialog--checks dialog--workflow-page dialog--workflow-checks">
      <header class="dialog-header">
        <div>
          <h2>{{ dialogTitle }}</h2>
          <p>{{ dialogDescription }}</p>
        </div>
      </header>

      <div class="dialog-body">
        <ul class="workflow-check-list">
          <li class="workflow-check-row" :class="`workflow-check-row--${mxfCheckStatus()}`">
            <span class="workflow-check-icon" aria-hidden="true">{{ statusIcon(mxfCheckStatus()) }}</span>
            <span class="workflow-check-label">MXF</span>
            <span class="workflow-check-value">{{ mxfCheckMessage() }}</span>
          </li>
          <li class="workflow-check-row" :class="`workflow-check-row--${wavCheckStatus()}`">
            <span class="workflow-check-icon" aria-hidden="true">{{ statusIcon(wavCheckStatus()) }}</span>
            <span class="workflow-check-label">WAV</span>
            <span class="workflow-check-value">{{ wavCheckMessage() }}</span>
          </li>
          <li class="workflow-check-row" :class="`workflow-check-row--${wavTypeCheckStatus()}`">
            <span class="workflow-check-icon" aria-hidden="true">{{ statusIcon(wavTypeCheckStatus()) }}</span>
            <span class="workflow-check-label">Poly-WAV Typ</span>
            <span class="workflow-check-value">{{ formatWavTypeLabel(wavType) }}</span>
          </li>
          <li class="workflow-check-row" :class="`workflow-check-row--${durationCheckStatusLabel()}`">
            <span class="workflow-check-icon" aria-hidden="true">{{ statusIcon(durationCheckStatusLabel()) }}</span>
            <span class="workflow-check-label">Länge</span>
            <span class="workflow-check-value">{{ durationCheckMessage ?? '-' }}</span>
          </li>
          <li
            v-if="error && mxfAnalysisState !== 'error' && wavAnalysisState !== 'error'"
            class="workflow-check-row"
            :class="`workflow-check-row--${genericErrorStatus()}`"
          >
            <span class="workflow-check-icon" aria-hidden="true">{{ statusIcon(genericErrorStatus()) }}</span>
            <span class="workflow-check-label">Fehler</span>
            <span class="workflow-check-value">{{ error }}</span>
          </li>
        </ul>
      </div>

      <footer class="dialog-footer">
        <button type="button" class="ghost" @click="emit('cancel')">Abbrechen</button>
        <button type="button" class="primary" :disabled="!canContinue" @click="emit('continue')">
          Weiter
        </button>
      </footer>
    </div>
  </section>
</template>
