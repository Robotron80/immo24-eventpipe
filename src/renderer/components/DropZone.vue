<script setup lang="ts">
import { computed, ref } from 'vue'
import { mdiFilmstrip, mdiWaveform } from '@mdi/js'

const props = defineProps<{
  mxfPath?: string
  wavPath?: string
}>()

const emit = defineEmits<{
  filesDropped: [payload: { mxfPath?: string; wavPath?: string }]
  clear: []
}>()

const isDragging = ref(false)
const showClear = computed(() => Boolean(props.mxfPath || props.wavPath))

function handleDragOver(event: DragEvent): void {
  event.preventDefault()
  isDragging.value = true
}

function handleDragLeave(): void {
  isDragging.value = false
}

function handleDrop(event: DragEvent): void {
  event.preventDefault()
  isDragging.value = false

  const files = event.dataTransfer?.files
  if (!files || files.length === 0) {
    return
  }

  let mxfPath: string | undefined
  let wavPath: string | undefined

  // We only care about first MXF and first WAV from the drop payload.
  for (const file of files) {
    const extension = file.name.split('.').pop()?.toLowerCase()
    // Prefer absolute filesystem paths via preload bridge; fallback keeps dev browser mode usable.
    const filePath =
      (typeof window !== 'undefined' && window.eventPipe ? window.eventPipe.getPathForFile(file) : '') ||
      (file as File & { path?: string }).path ||
      file.name

    if (extension === 'mxf' && !mxfPath) {
      mxfPath = filePath
    }

    if (extension === 'wav' && !wavPath) {
      wavPath = filePath
    }
  }

  if (!mxfPath && !wavPath) {
    return
  }

  emit('filesDropped', { mxfPath, wavPath })
}
</script>

<template>
  <section
    class="drop-zone"
    :class="{ 'drop-zone--active': isDragging }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <div class="drop-card" aria-label="Drop area status">
      <button v-if="showClear" type="button" class="dropzone-clear-x" aria-label="Leeren" @click.stop="emit('clear')">
        <span aria-hidden="true">×</span>
      </button>

      <div class="drop-halves">
        <div class="drop-half" :class="{ 'drop-half--active': !!mxfPath }" aria-label="MXF status">
          <div class="drop-icon">
            <svg viewBox="0 0 80 80" role="img" aria-hidden="true">
              <path class="doc-shell" d="M20 10h28l12 12v46H20z" />
              <path class="doc-fold" d="M48 10v12h12" />
              <path class="mdi-glyph" :d="mdiFilmstrip" transform="translate(25 25) scale(1.3)" />
            </svg>
            <span v-if="mxfPath" class="checkmark" aria-hidden="true">✓</span>
          </div>
        </div>

        <div class="drop-divider" aria-hidden="true"></div>

        <div class="drop-half" :class="{ 'drop-half--active': !!wavPath }" aria-label="WAV status">
          <div class="drop-icon">
            <svg viewBox="0 0 80 80" role="img" aria-hidden="true">
              <path class="doc-shell" d="M20 10h28l12 12v46H20z" />
              <path class="doc-fold" d="M48 10v12h12" />
              <path class="mdi-glyph" :d="mdiWaveform" transform="translate(23 23) scale(1.5)" />
            </svg>
            <span v-if="wavPath" class="checkmark" aria-hidden="true">✓</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
