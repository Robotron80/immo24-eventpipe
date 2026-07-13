<script setup lang="ts">
import type { AudioMappingEntry } from '../../shared/types'
import type { WavType } from '../../shared/types'

defineProps<{
  dialogTitle: string
  canExport: boolean
  mapping: AudioMappingEntry[]
  wavType?: WavType
}>()

const emit = defineEmits<{
  (event: 'cancel'): void
  (event: 'continue'): void
}>()

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
</script>

<template>
  <section class="overlay">
    <div class="dialog dialog--checks dialog--workflow-page dialog--workflow-mapping">
      <header class="dialog-header">
        <div>
          <h2>{{ dialogTitle }}</h2>
          <p>Mapping-Schema: {{ formatWavTypeLabel(wavType) }}</p>
        </div>
      </header>

      <div class="dialog-body">
        <section class="workflow-mapping-content">
          <table class="workflow-mapping-table">
            <colgroup>
              <col class="workflow-mapping-col--num" />
              <col class="workflow-mapping-col--num" />
              <col class="workflow-mapping-col--name" />
            </colgroup>
            <thead>
              <tr>
                <th>MXF</th>
                <th>WAV</th>
                <th class="mapping-name-col">Name</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in mapping" :key="`${row.mxfTrack}-${row.wavChannel}`">
                <td>{{ row.mxfTrack }}</td>
                <td>{{ row.wavChannel }}</td>
                <td class="mapping-name">{{ row.name || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      <footer class="dialog-footer">
        <button type="button" class="ghost" @click="emit('cancel')">Abbrechen</button>
        <button type="button" class="primary" :disabled="!canExport" @click="emit('continue')">
          Weiter
        </button>
      </footer>
    </div>
  </section>
</template>
