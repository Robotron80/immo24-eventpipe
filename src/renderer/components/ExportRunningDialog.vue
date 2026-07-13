<script setup lang="ts">
defineProps<{
  progressPercent?: number
  progressDetails?: string
}>()
</script>

<template>
  <section class="overlay">
    <div class="dialog dialog--checks dialog--workflow-page dialog--workflow-running">
      <header class="dialog-header">
        <div>
          <h2>Export läuft</h2>
          <p>Bitte warten, der Export wird verarbeitet.</p>
        </div>
      </header>

      <div class="dialog-body">
        <section class="workflow-running-content">
          <h3>Status</h3>
          <p class="export-running">Export läuft...</p>

          <div class="export-progress-wrap export-progress-wrap--full">
            <div class="export-progress-bar" role="progressbar" :aria-valuenow="Math.round(progressPercent ?? 0)">
              <span :style="{ width: `${Math.max(0, Math.min(100, progressPercent ?? 0))}%` }"></span>
            </div>
            <p v-if="progressDetails" class="export-progress">{{ progressDetails }}</p>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>
