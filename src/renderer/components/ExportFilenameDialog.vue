<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'cancel'): void
  (event: 'confirm'): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)

const isValid = computed(() => props.modelValue.trim().length > 0)

function onFilenameInput(event: Event): void {
  const rawValue = (event.target as HTMLInputElement).value
  const normalizedValue = rawValue.replace(/\.mxf$/i, '')
  emit('update:modelValue', normalizedValue)
}

onMounted(async () => {
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
})
</script>

<template>
  <section class="overlay">
    <div class="dialog dialog--checks dialog--filename dialog--workflow-page dialog--workflow-filename">
      <header class="dialog-header">
        <div>
          <h2>Dateiname für Export</h2>
          <p>Bitte Exportnamen festlegen</p>
        </div>
      </header>

      <div class="dialog-body">
        <section class="workflow-filename-content">
          <label class="workflow-filename-label" for="workflow-export-name">Dateiname</label>
          <div class="workflow-filename-input-wrap">
            <input
              id="workflow-export-name"
              ref="inputRef"
              :value="modelValue"
              type="text"
              class="filename-input filename-input--with-suffix"
              placeholder="Story_DFB"
              @input="onFilenameInput"
            />
            <span class="workflow-filename-suffix" aria-hidden="true">.mxf</span>
          </div>
        </section>
      </div>

      <footer class="dialog-footer">
        <button type="button" class="ghost" @click="emit('cancel')">Abbrechen</button>
        <button type="button" class="primary" :disabled="!isValid" @click="emit('confirm')">Exportieren</button>
      </footer>
    </div>
  </section>
</template>
