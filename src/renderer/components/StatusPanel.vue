<script setup lang="ts">
import type { WavType } from '../../shared/types'

defineProps<{
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
</script>

<template>
  <section class="panel">
    <h3>Status und Checks</h3>
    <ul>
      <li :class="{ ok: mxfAnalysisState === 'ok', warn: mxfAnalysisState === 'idle', error: mxfAnalysisState === 'error' }">
        MXF:
        {{
          mxfAnalysisState === 'ok'
            ? 'OK'
            : mxfAnalysisState === 'error'
              ? `Failed${mxfAnalysisError ? ` (${mxfAnalysisError})` : ''}`
              : '-'
        }}
      </li>
      <li :class="{ ok: wavAnalysisState === 'ok' && wavPcmCheckState === 'ok', warn: wavAnalysisState === 'running' || wavAnalysisState === 'idle' || (wavAnalysisState === 'ok' && wavPcmCheckState === 'warn'), error: wavAnalysisState === 'error' }">
        WAV:
        {{
          wavAnalysisState === 'ok'
            ? wavPcmCheckState === 'ok'
              ? 'OK'
              : 'Warning (codec is not PCM)'
            : wavAnalysisState === 'running'
              ? 'Running'
              : wavAnalysisState === 'error'
                ? `Failed${wavAnalysisError ? ` (${wavAnalysisError})` : ''}`
                : '-'
        }}
      </li>
      <li :class="{ ok: wavType && wavType !== 'unknown', warn: wavType === 'unknown' || !wavType }">
        Mapping Type: {{ wavType ?? '-' }}
      </li>
      <li :class="{ ok: durationCheckState === 'ok', warn: durationCheckState === 'warn' }">
        Duration Check: {{ durationCheckMessage ?? '-' }}
      </li>
      <li v-if="error && mxfAnalysisState !== 'error' && wavAnalysisState !== 'error'" class="error">Error: {{ error }}</li>
    </ul>
  </section>
</template>
