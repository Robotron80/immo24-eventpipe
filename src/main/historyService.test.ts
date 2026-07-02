import fs from 'fs/promises'
import os from 'os'
import path from 'path'

import { afterEach, describe, expect, it } from 'vitest'

import { appendExportHistory, getExportHistoryPath, readExportHistory } from './historyService'
import type { ExportHistoryEntry } from '../shared/types'

const testDirs: string[] = []

async function makeTempDir(name: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `eventpipe-${name}-`))
  testDirs.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(testDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })))
})

describe('historyService', () => {
  it('appends and reads export history entries in reverse chronological order', async () => {
    const root = await makeTempDir('history-order')
    const configPath = path.join(root, 'config.json')
    const historyPath = getExportHistoryPath(configPath)

    const first: ExportHistoryEntry = {
      id: 'a1',
      timestamp: '2026-07-01T10:00:00.000Z',
      status: 'success',
      mxfPath: '/tmp/input-a.mxf',
      wavPath: '/tmp/input-a.wav',
      mappingCount: 8,
    }

    const second: ExportHistoryEntry = {
      id: 'a2',
      timestamp: '2026-07-01T10:01:00.000Z',
      status: 'error',
      mxfPath: '/tmp/input-b.mxf',
      wavPath: '/tmp/input-b.wav',
      mappingCount: 8,
      manualSelectionApplied: true,
      errorMessage: 'ffmpeg failed',
    }

    await appendExportHistory(historyPath, first)
    await appendExportHistory(historyPath, second)

    const entries = await readExportHistory(historyPath, 10)

    expect(entries).toHaveLength(2)
    expect(entries[0].id).toBe('a2')
    expect(entries[1].id).toBe('a1')
  })

  it('returns empty array if history file does not exist', async () => {
    const root = await makeTempDir('history-empty')
    const historyPath = path.join(root, 'missing-history.jsonl')

    const entries = await readExportHistory(historyPath, 5)
    expect(entries).toEqual([])
  })
})
