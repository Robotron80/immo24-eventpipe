import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

import type { EventPipeSettings } from '../shared/types'

export const CONFIG_FILE_NAME = 'config.json'

function resolveBinaryPath(binaryName: string): string {
  const executableName = process.platform === 'win32' ? `${binaryName}.exe` : binaryName
  const bundledCandidates = [
    path.join(process.resourcesPath, 'bin', executableName),
    path.join(process.resourcesPath, 'tools', executableName),
    path.join(process.cwd(), 'resources', 'bin', executableName),
  ]

  for (const candidate of bundledCandidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  if (process.platform === 'darwin') {
    const macCandidates = ['/opt/homebrew/bin', '/usr/local/bin']
    for (const dir of macCandidates) {
      const candidate = path.join(dir, binaryName)
      if (existsSync(candidate)) {
        return candidate
      }
    }
  }

  return binaryName
}

export const DEFAULT_SETTINGS: EventPipeSettings = {
  watchFolder: path.join(process.cwd(), 'eventpipe-watchfolder'),
  tempExportFolder: path.join(process.cwd(), 'eventpipe-temp'),
  ffmpegPath: resolveBinaryPath('ffmpeg'),
  ffprobePath: resolveBinaryPath('ffprobe'),
  namingPreset: '{sourceName}',
  maxDurationDeltaSeconds: 0.2,
  debugLoggingEnabled: false,
}

function ensureText(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

export function sanitizeSettings(raw: Partial<EventPipeSettings> | undefined): EventPipeSettings {
  const ffmpegPath = resolveBinaryPath('ffmpeg')
  const ffprobePath = resolveBinaryPath('ffprobe')

  return {
    watchFolder: ensureText(raw?.watchFolder, DEFAULT_SETTINGS.watchFolder),
    tempExportFolder: ensureText(raw?.tempExportFolder, DEFAULT_SETTINGS.tempExportFolder),
    ffmpegPath,
    ffprobePath,
    namingPreset: ensureText(raw?.namingPreset, DEFAULT_SETTINGS.namingPreset),
    maxDurationDeltaSeconds: DEFAULT_SETTINGS.maxDurationDeltaSeconds,
    debugLoggingEnabled: DEFAULT_SETTINGS.debugLoggingEnabled,
  }
}

export function getConfigPath(): string {
  if (process.env.EVENTPIPE_CONFIG_PATH?.trim()) {
    return process.env.EVENTPIPE_CONFIG_PATH.trim()
  }

  if (process.platform === 'darwin') {
    return path.join('/Users/Shared', 'immo24-eventpipe', CONFIG_FILE_NAME)
  }

  if (process.platform === 'win32') {
    const programData = process.env.PROGRAMDATA?.trim() || path.join('C:', 'ProgramData')
    return path.join(programData, 'immo24-eventpipe', CONFIG_FILE_NAME)
  }

  return path.join('/var/lib', 'immo24-eventpipe', CONFIG_FILE_NAME)
}

export async function hasSettingsFile(configPath: string): Promise<boolean> {
  try {
    await fs.access(configPath)
    return true
  } catch {
    return false
  }
}

export async function loadSettings(configPath: string): Promise<EventPipeSettings> {
  try {
    const payload = await fs.readFile(configPath, 'utf-8')
    const parsed = JSON.parse(payload) as Partial<EventPipeSettings>
    return sanitizeSettings(parsed)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveSettings(configPath: string, raw: Partial<EventPipeSettings>): Promise<EventPipeSettings> {
  const settings = sanitizeSettings(raw)
  await fs.mkdir(path.dirname(configPath), { recursive: true })
  await fs.writeFile(configPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf-8')
  return settings
}
