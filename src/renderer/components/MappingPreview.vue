<script setup lang="ts">
import type { AudioMappingEntry } from '../../shared/types'

defineProps<{
  mapping: AudioMappingEntry[]
}>()
</script>

<template>
  <section class="panel">
    <h3>Mapping Vorschau</h3>
    <table>
      <thead>
        <tr>
          <th>MXF Trk</th>
          <th>WAV Ch</th>
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
</template>
