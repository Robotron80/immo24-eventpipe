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

onMounted(async () => {
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
})
</script>

<template>
  <section class="overlay">
    <div class="dialog dialog--filename">
      <header class="dialog-header">
        <div>
          <h2>Dateiname für Export</h2>
          <p>Geben Sie einen Namen für die MXF-Datei ein (ohne Dateityp):</p>
        </div>
      </header>

      <div class="dialog-body">
        <input
          ref="inputRef"
          :value="modelValue"
          type="text"
          class="filename-input"
          placeholder="z.B. mein_export"
          @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
          @keyup.enter="emit('confirm')"
        />
      </div>

      <footer class="dialog-footer">
        <button type="button" class="ghost" @click="emit('cancel')">Abbrechen</button>
        <button type="button" class="primary" :disabled="!isValid" @click="emit('confirm')">Exportieren</button>
      </footer>
    </div>
  </section>
</template>
