import { existsSync } from 'node:fs'
import { copyFile, mkdir, chmod, readdir, rm, rename } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')

const targetPlatform = process.env.EVENTPIPE_BINARY_TARGET ?? `${process.platform}-${process.arch}`
const isWindowsTarget = targetPlatform.startsWith('win32-')

const pathSeparator = process.platform === 'win32' ? ';' : ':'

function findInPath(binaryName) {
  const pathEntries = (process.env.PATH ?? '').split(pathSeparator).filter(Boolean)

  for (const entry of pathEntries) {
    const candidate = path.join(entry, binaryName)
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return undefined
}

function detectLocalBinaryPath(binaryName) {
  if (process.platform === 'darwin') {
    const macCandidates = [
      path.join('/opt/homebrew/bin', binaryName),
      path.join('/usr/local/bin', binaryName),
    ]

    for (const candidate of macCandidates) {
      if (existsSync(candidate)) {
        return candidate
      }
    }
  }

  return findInPath(binaryName)
}

function resolveSourcePath(envName, fallbackBinaryName) {
  const configured = process.env[envName]?.trim()
  if (configured) {
    return { sourcePath: configured, isExplicit: true }
  }

  if (targetPlatform !== `${process.platform}-${process.arch}`) {
    return { sourcePath: undefined, isExplicit: false }
  }

  const detected = detectLocalBinaryPath(fallbackBinaryName)
  if (!detected) {
    throw new Error(`Could not detect local ${fallbackBinaryName}. Set ${envName} explicitly.`)
  }

  return { sourcePath: detected, isExplicit: false }
}

const binaries = [
  {
    source: resolveSourcePath('EVENTPIPE_FFMPEG_SOURCE', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'),
    outputName: isWindowsTarget ? 'ffmpeg.exe' : 'ffmpeg',
  },
  {
    source: resolveSourcePath('EVENTPIPE_FFPROBE_SOURCE', process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'),
    outputName: isWindowsTarget ? 'ffprobe.exe' : 'ffprobe',
  },
]

async function main() {
  const binaryRootDir = path.join(projectRoot, 'resources', 'bin')
  const binaryArchiveRootDir = path.join(projectRoot, 'resources', 'bin-archive')
  await mkdir(binaryRootDir, { recursive: true })
  await mkdir(binaryArchiveRootDir, { recursive: true })

  const existingEntries = await readdir(binaryRootDir, { withFileTypes: true })
  for (const entry of existingEntries) {
    if (!entry.isDirectory() || entry.name === targetPlatform) {
      continue
    }

    const sourceDir = path.join(binaryRootDir, entry.name)
    const archiveDir = path.join(binaryArchiveRootDir, entry.name)
    await rm(archiveDir, { recursive: true, force: true })
    await rename(sourceDir, archiveDir)
    console.log(`archived ${sourceDir} -> ${archiveDir}`)
  }

  const targetDir = path.join(projectRoot, 'resources', 'bin', targetPlatform)
  await mkdir(targetDir, { recursive: true })

  for (const binary of binaries) {
    const targetPath = path.join(targetDir, binary.outputName)
    const archiveDir = path.join(binaryArchiveRootDir, targetPlatform)
    const archivePath = path.join(archiveDir, binary.outputName)
    const sourcePath = binary.source.sourcePath

    // Prefer already prepared target binaries unless source was explicitly configured.
    if (existsSync(targetPath) && !binary.source.isExplicit) {
      await mkdir(archiveDir, { recursive: true })
      await copyFile(targetPath, archivePath)
      console.log(`kept existing ${targetPath}`)
      continue
    }

    // If custom binaries were archived during another target build, restore them
    // before falling back to auto-detected system binaries (e.g. Homebrew).
    if (!binary.source.isExplicit && existsSync(archivePath)) {
      await mkdir(targetDir, { recursive: true })
      await copyFile(archivePath, targetPath)

      if (!isWindowsTarget) {
        await chmod(targetPath, 0o755)
      }

      console.log(`restored ${archivePath} -> ${targetPath}`)
      continue
    }

    if (!sourcePath) {
      if (existsSync(targetPath)) {
        console.log(`kept existing ${targetPath}`)
        continue
      }

      throw new Error(
        `Missing ${binary.outputName} for ${targetPlatform}. Provide source via environment variable or place file at ${targetPath}.`,
      )
    }

    if (!existsSync(sourcePath)) {
      throw new Error(`Source binary not found: ${sourcePath}`)
    }

    await copyFile(sourcePath, targetPath)
    await mkdir(archiveDir, { recursive: true })
    await copyFile(sourcePath, archivePath)

    if (!isWindowsTarget) {
      await chmod(targetPath, 0o755)
      await chmod(archivePath, 0o755)
    }

    console.log(`copied ${sourcePath} -> ${targetPath}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})