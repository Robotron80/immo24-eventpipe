<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import type { ExportHistoryEntry } from '../../shared/types'

defineProps<{
  title: string
  error?: string
  exportMessage?: string
  exportLogPath?: string
  exportDetails?: string
  copyLogStatus: 'idle' | 'copied' | 'error'
  copyDetailsStatus: 'idle' | 'copied' | 'error'
  recentExportHistory: ExportHistoryEntry[]
}>()

const emit = defineEmits<{
  (event: 'copyLogPath'): void
  (event: 'copyExportDetails'): void
  (event: 'close'): void
}>()

const okButton = ref<HTMLButtonElement | null>(null)

onMounted(async () => {
  await nextTick()
  okButton.value?.focus()
})
</script>

<template>
  <section class="overlay">
    <div class="dialog dialog--checks">
      <header class="dialog-header">
        <div>
          <h2>{{ title }}</h2>
          <p>Exportstatus und Log-Ausgabe.</p>
        </div>
      </header>

      <div class="dialog-body">
        <section class="panel export-result-panel">
          <h3>Status</h3>
          <p v-if="error" class="export-error">{{ error }}</p>
          <p v-else-if="exportMessage" class="export-message">{{ exportMessage }}</p>

          <p v-if="exportLogPath" class="export-log-path">
            Log: {{ exportLogPath }}
            <button type="button" class="ghost export-log-copy" @click="emit('copyLogPath')">Log-Pfad kopieren</button>
            <span v-if="copyLogStatus === 'copied'">Kopiert</span>
            <span v-if="copyLogStatus === 'error'">Kopieren fehlgeschlagen</span>
          </p>

          <p v-if="exportDetails" class="export-log-path">
            <button type="button" class="ghost export-log-copy" @click="emit('copyExportDetails')">
              ffmpeg-Details kopieren
            </button>
            <span v-if="copyDetailsStatus === 'copied'">Kopiert</span>
            <span v-if="copyDetailsStatus === 'error'">Kopieren fehlgeschlagen</span>
          </p>

          <section v-if="recentExportHistory.length > 0" class="export-history">
            <h4>Letzte Exporte</h4>
            <ul>
              <li v-for="entry in recentExportHistory" :key="entry.id">
                {{ new Date(entry.timestamp).toLocaleString() }} - {{ entry.status === 'success' ? 'OK' : 'ERROR' }}
                <span v-if="entry.manualSelectionApplied"> (manuelle WAV-Auswahl)</span>
              </li>
            </ul>
          </section>
        </section>
      </div>

      <footer class="dialog-footer">
        <button ref="okButton" type="button" class="primary" @click="emit('close')">OK</button>
      </footer>
    </div>
  </section>
</template>
