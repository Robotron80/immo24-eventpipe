import fs from 'fs/promises'
import os from 'os'
import path from 'path'

import { afterEach, describe, expect, it } from 'vitest'

import { publishToWatchFolder } from './filePublisher'

const testDirs: string[] = []

async function makeTempDir(name: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `eventpipe-${name}-`))
  testDirs.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(testDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })))
})

describe('publishToWatchFolder', () => {
  it('publishes finished temp file to watchfolder', async () => {
    const root = await makeTempDir('publish-success')
    const tempDir = path.join(root, 'temp')
    const watchDir = path.join(root, 'watch')

    await fs.mkdir(tempDir, { recursive: true })

    const tempFile = path.join(tempDir, 'demo.mxf')
    await fs.writeFile(tempFile, 'MXF_CONTENT')

    const result = await publishToWatchFolder(tempFile, watchDir)
    const publishedData = await fs.readFile(result.publishedPath, 'utf-8')

    expect(result.conflictResolved).toBe(false)
    expect(result.publishedPath).toBe(path.join(watchDir, 'demo.mxf'))
    expect(publishedData).toBe('MXF_CONTENT')
    await expect(fs.access(tempFile)).rejects.toThrow()
  })

  it('resolves target conflicts by incrementing filename suffix', async () => {
    const root = await makeTempDir('publish-conflict')
    const tempDir = path.join(root, 'temp')
    const watchDir = path.join(root, 'watch')

    await fs.mkdir(tempDir, { recursive: true })
    await fs.mkdir(watchDir, { recursive: true })

    const existingTarget = path.join(watchDir, 'demo.mxf')
    await fs.writeFile(existingTarget, 'OLD_CONTENT')

    const tempFile = path.join(tempDir, 'demo.mxf')
    await fs.writeFile(tempFile, 'NEW_CONTENT')

    const result = await publishToWatchFolder(tempFile, watchDir)

    expect(result.conflictResolved).toBe(true)
    expect(result.publishedPath).toBe(path.join(watchDir, 'demo__001.mxf'))

    const existingData = await fs.readFile(existingTarget, 'utf-8')
    const newData = await fs.readFile(result.publishedPath, 'utf-8')

    expect(existingData).toBe('OLD_CONTENT')
    expect(newData).toBe('NEW_CONTENT')
    await expect(fs.access(tempFile)).rejects.toThrow()
  })
})
