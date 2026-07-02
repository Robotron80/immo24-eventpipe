<script setup lang="ts">
import { computed, ref } from 'vue'

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

  for (const file of files) {
    const extension = file.name.split('.').pop()?.toLowerCase()
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
    <button v-if="showClear" type="button" class="dropzone-clear-x" aria-label="Leeren" @click.stop="emit('clear')">
      <span aria-hidden="true">×</span>
    </button>

    <div class="drop-icons" aria-label="Drop area status">
      <div class="media-icon" :class="{ 'media-icon--active': !!mxfPath }" aria-label="MXF status">
        <svg viewBox="0 0 80 80" role="img" aria-hidden="true">
          <path class="doc-shell" d="M20 10h28l12 12v46H20z" />
          <path class="doc-fold" d="M48 10v12h12" />
          <rect class="filmstrip" x="27" y="30" width="26" height="20" rx="3" ry="3" />
          <circle class="film-hole" cx="30" cy="35" r="1.8" />
          <circle class="film-hole" cx="30" cy="45" r="1.8" />
          <circle class="film-hole" cx="50" cy="35" r="1.8" />
          <circle class="film-hole" cx="50" cy="45" r="1.8" />
        </svg>
        <span v-if="mxfPath" class="checkmark" aria-hidden="true">✓</span>
      </div>

      <div class="media-icon" :class="{ 'media-icon--active': !!wavPath }" aria-label="WAV status">
        <svg viewBox="0 0 80 80" role="img" aria-hidden="true">
          <path class="doc-shell" d="M20 10h28l12 12v46H20z" />
          <path class="doc-fold" d="M48 10v12h12" />
          <path class="wave-line" d="M27 42h5l3-9 5 17 5-22 3 14h5" />
        </svg>
        <span v-if="wavPath" class="checkmark" aria-hidden="true">✓</span>
      </div>
    </div>
  </section>
</template>
