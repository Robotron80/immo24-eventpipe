import { randomUUID } from 'node:crypto'

import type { EventPipeJob } from '../shared/types'

export function createEmptyJob(tempExportFolder: string, watchFolder: string): EventPipeJob {
  return {
    id: randomUUID(),
    tempExportFolder,
    watchFolder,
    namingPreset: '{sourceName}',
  }
}
