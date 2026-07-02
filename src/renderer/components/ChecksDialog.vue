<script setup lang="ts">
import type { AudioMappingEntry, WavType } from '../../shared/types'
import MappingPreview from './MappingPreview.vue'
import StatusPanel from './StatusPanel.vue'

defineProps<{
  dialogTitle: string
  dialogDescription: string
  dialogPrimaryLabel: string
  dialogStep: 'checks' | 'mapping'
  showStatusPanelInDialog: boolean
  showMappingPreviewInDialog: boolean
  canContinue: boolean
  canExport: boolean
  wavType?: WavType
  mxfAnalysisState?: 'idle' | 'ok' | 'error'
  wavAnalysisState?: 'idle' | 'running' | 'ok' | 'error'
  mxfAnalysisError?: string
  wavAnalysisError?: string
  wavPcmCheckState?: 'ok' | 'warn' | 'unknown'
  durationCheckState?: 'ok' | 'warn' | 'unknown'
  durationCheckMessage?: string
  error?: string
  mapping: AudioMappingEntry[]
}>()

const emit = defineEmits<{
  (event: 'cancel'): void
  (event: 'continue'): void
}>()
</script>

<template>
  <section class="overlay">
    <div class="dialog dialog--checks">
      <header class="dialog-header">
        <div>
          <h2>{{ dialogTitle }}</h2>
          <p>{{ dialogDescription }}</p>
        </div>
      </header>

      <div class="dialog-body">
        <div class="dialog-panels" :class="{ 'dialog-panels--single': !showStatusPanelInDialog }">
          <StatusPanel
            v-if="showStatusPanelInDialog"
            :wav-type="wavType"
            :mxf-analysis-state="mxfAnalysisState"
            :wav-analysis-state="wavAnalysisState"
            :mxf-analysis-error="mxfAnalysisError"
            :wav-analysis-error="wavAnalysisError"
            :wav-pcm-check-state="wavPcmCheckState"
            :duration-check-state="durationCheckState"
            :duration-check-message="durationCheckMessage"
            :error="error"
          />

          <MappingPreview v-if="showMappingPreviewInDialog" :mapping="mapping" />
        </div>

      </div>

      <footer class="dialog-footer">
        <button type="button" class="ghost" @click="emit('cancel')">Cancel</button>
        <button
          type="button"
          class="primary"
          :disabled="dialogStep === 'checks' ? !canContinue : !canExport"
          @click="emit('continue')"
        >
          {{ dialogPrimaryLabel }}
        </button>
      </footer>
    </div>
  </section>
</template>
