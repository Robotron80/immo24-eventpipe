<script setup lang="ts">
import { reactive } from 'vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const model = reactive({
  watchFolder: '',
  tempExportFolder: '',
})

function closeDialog(): void {
  emit('close')
}
</script>

<template>
  <div v-if="props.open" class="overlay" @click.self="closeDialog">
    <div class="dialog">
      <h3>Konfiguration</h3>
      <label>
        Watchfolder
        <input v-model="model.watchFolder" placeholder="Select watchfolder" />
      </label>
      <label>
        Temp export folder
        <input v-model="model.tempExportFolder" placeholder="Select temp folder" />
      </label>
      <button type="button" class="ghost" @click="closeDialog">Close</button>
    </div>
  </div>
</template>
