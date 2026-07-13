<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

defineProps<{
  title: string
  error?: string
  exportMessage?: string
  exportDurationLabel?: string
  exportLogPath?: string
  logOpenStatus: 'idle' | 'error'
}>()

const emit = defineEmits<{
  (event: 'openLog'): void
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
    <div class="dialog dialog--checks dialog--workflow-page dialog--workflow-result">
      <header class="dialog-header">
        <div>
          <h2>{{ title }}</h2>
          <p>Status und Logs</p>
        </div>
      </header>

      <div class="dialog-body">
        <section class="workflow-result-content export-result-panel">
          <h3>Status</h3>
          <p v-if="error" class="export-error">{{ error }}</p>
          <p v-else-if="exportMessage" class="export-message">{{ exportMessage }}</p>
          <p v-if="exportDurationLabel" class="export-duration">Dauer: {{ exportDurationLabel }}</p>

          <div v-if="exportLogPath" class="export-log-actions">
            <button type="button" class="ghost export-log-open-button" @click="emit('openLog')">Log öffnen</button>
            <span v-if="logOpenStatus === 'error'" class="export-log-open-error">Log konnte nicht geöffnet werden</span>
          </div>
        </section>
      </div>

      <footer class="dialog-footer">
        <button ref="okButton" type="button" class="primary" @click="emit('close')">OK</button>
      </footer>
    </div>
  </section>
</template>
