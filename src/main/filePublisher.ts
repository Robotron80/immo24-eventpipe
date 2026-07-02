import fs from 'node:fs/promises'
import path from 'node:path'

export interface PublishResult {
  publishedPath: string
  conflictResolved: boolean
}

async function ensureFinishedTempFile(tempFile: string): Promise<void> {
  const stats = await fs.stat(tempFile)

  if (!stats.isFile()) {
    throw new Error(`Temp export is not a file: ${tempFile}`)
  }

  if (stats.size <= 0) {
    throw new Error(`Temp export is empty: ${tempFile}`)
  }
}

async function resolvePublishTarget(preferredTarget: string): Promise<{ path: string; conflictResolved: boolean }> {
  const parsed = path.parse(preferredTarget)

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    // On name collisions we append __001, __002, ... to keep older files untouched.
    const suffix = attempt === 0 ? '' : `__${String(attempt).padStart(3, '0')}`
    const candidate = path.join(parsed.dir, `${parsed.name}${suffix}${parsed.ext}`)

    try {
      await fs.access(candidate)
    } catch {
      return {
        path: candidate,
        conflictResolved: attempt > 0,
      }
    }
  }

  throw new Error(`Could not resolve publish target after many conflicts: ${preferredTarget}`)
}

export async function publishToWatchFolder(tempFile: string, watchFolder: string): Promise<PublishResult> {
  if (!watchFolder.trim()) {
    throw new Error('Watchfolder is not configured.')
  }

  await ensureFinishedTempFile(tempFile)
  await fs.mkdir(watchFolder, { recursive: true })

  const preferredTarget = path.join(watchFolder, path.basename(tempFile))
  const target = await resolvePublishTarget(preferredTarget)
  const stagingPath = path.join(
    watchFolder,
    `.${path.basename(target.path)}.${Date.now()}.eventpipe-copying`,
  )
  let sourceMoved = false

  try {
    try {
      // Preferred path: atomic move from temp into watchfolder staging file.
      await fs.rename(tempFile, stagingPath)
      sourceMoved = true
    } catch (moveError) {
      // Fallback for cross-device moves (EXDEV): copy then remove source.
      const code = typeof moveError === 'object' && moveError !== null && 'code' in moveError
        ? String((moveError as { code?: unknown }).code)
        : ''

      if (code !== 'EXDEV') {
        throw moveError
      }

      await fs.copyFile(tempFile, stagingPath)
      await fs.rm(tempFile, { force: true })
      sourceMoved = true
    }

    // Finalize by renaming hidden staging file to the visible target file.
    await fs.rename(stagingPath, target.path)
  } catch (error) {
    if (sourceMoved) {
      try {
        await fs.rename(stagingPath, tempFile)
      } catch {
        await fs.rm(stagingPath, { force: true })
      }
    } else {
      await fs.rm(stagingPath, { force: true })
    }

    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Publishing to watchfolder failed: ${message}`)
  }

  return {
    publishedPath: target.path,
    conflictResolved: target.conflictResolved,
  }
}
