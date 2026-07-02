import fs from 'node:fs/promises'
import path from 'node:path'

import type { ExportHistoryEntry } from '../shared/types'

export function getExportHistoryPath(configPath: string): string {
  return path.join(path.dirname(configPath), 'export-history.jsonl')
}

export async function appendExportHistory(historyPath: string, entry: ExportHistoryEntry): Promise<void> {
  await fs.mkdir(path.dirname(historyPath), { recursive: true })
  await fs.appendFile(historyPath, `${JSON.stringify(entry)}\n`, 'utf-8')
}

export async function readExportHistory(historyPath: string, limit = 20): Promise<ExportHistoryEntry[]> {
  try {
    const payload = await fs.readFile(historyPath, 'utf-8')
    const lines = payload
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    const parsed: ExportHistoryEntry[] = []
    for (let index = lines.length - 1; index >= 0 && parsed.length < limit; index -= 1) {
      try {
        parsed.push(JSON.parse(lines[index]) as ExportHistoryEntry)
      } catch {
        // Ignore malformed history lines to keep history resilient.
      }
    }

    return parsed
  } catch {
    return []
  }
}
