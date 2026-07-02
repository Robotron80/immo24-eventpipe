import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

import { analyzeWavWithFfprobe } from './ffprobeService'
import { publishToWatchFolder } from './filePublisher'
import type {
  AudioMappingEntry,
  EventPipeSettings,
  ExportJobRequest,
  ExportJobResult,
  ExportProgressUpdate,
} from '../shared/types'

export function buildFfmpegArgs(mxfPath: string, wavPath: string, mapping: AudioMappingEntry[], outputPath: string): string[] {
  // Each WAV channel is split into mono and mapped to a dedicated MXF audio stream.
  const filterChains = mapping.map(
    (entry, index) => `[1:a]pan=mono|c0=c${entry.wavChannel - 1}[a${index}]`,
  )
  const mappedMonoStreams = mapping.flatMap((_entry, index) => ['-map', `[a${index}]`])

  return [
    '-i',
    mxfPath,
    '-i',
    wavPath,
    '-stats',
    '-map',
    '0:v',
    '-filter_complex',
    filterChains.join(';'),
    '-c:v',
    'copy',
    ...mappedMonoStreams,
    '-c:a',
    'pcm_s24le',
    '-y',
    outputPath,
  ]
}

function applyNamingPreset(preset: string, sourceName: string): string {
  const resolvedPreset = preset.trim() || '{sourceName}'
  return resolvedPreset.replaceAll('{sourceName}', sourceName)
}

function sanitizeFileNameSegment(value: string): string {
  const sanitized = value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').trim()
  return sanitized || 'eventpipe-export'
}

function parseTimecodeToSeconds(timecode: string): number {
  const [hh, mm, ss] = timecode.split(':')
  return Number(hh) * 3600 + Number(mm) * 60 + Number(ss)
}

function parseProgress(rawLine: string, inputDurationSeconds?: number): ExportProgressUpdate | undefined {
  const timeMatch = /time=([0-9:.]+)/.exec(rawLine)
  const speedMatch = /speed=\s*([0-9.]+x)/.exec(rawLine)

  if (!timeMatch && !speedMatch) {
    return undefined
  }

  const update: ExportProgressUpdate = {
    timecode: timeMatch?.[1],
    speed: speedMatch?.[1],
  }

  if (timeMatch && typeof inputDurationSeconds === 'number' && inputDurationSeconds > 0) {
    // ffmpeg emits absolute timestamps; convert them to percentage for UI progress.
    const seconds = parseTimecodeToSeconds(timeMatch[1])
    update.percent = Math.max(0, Math.min(100, (seconds / inputDurationSeconds) * 100))
  }

  return update
}

async function writeExportLog(
  sourceName: string,
  settings: EventPipeSettings,
  content: string,
  status: 'success' | 'error',
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const logsDir = path.join(settings.tempExportFolder, 'logs')
  await fs.mkdir(logsDir, { recursive: true })

  const fileName = `${timestamp}-${sanitizeFileNameSegment(sourceName)}-${status}.log`
  const logPath = path.join(logsDir, fileName)
  await fs.writeFile(logPath, content, 'utf-8')
  return logPath
}

function runFfmpeg(
  command: string,
  args: string[],
  inputDurationSeconds?: number,
  onProgress?: (update: ExportProgressUpdate) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
    })
    let output = ''
    let progressBuffer = ''

    child.stdout.on('data', (chunk) => {
      output += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      output += text
      progressBuffer += text

      const lines = progressBuffer.split(/\r|\n/)
      progressBuffer = lines.pop() ?? ''

      for (const line of lines) {
        const update = parseProgress(line, inputDurationSeconds)
        if (update && onProgress) {
          onProgress(update)
        }
      }
    })

    child.on('error', (error) => {
      reject(new Error(`Failed to start ffmpeg: ${error.message}`))
    })

    child.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve(output.trim())
        return
      }

      reject(new Error(`ffmpeg exited with code ${exitCode}.\n${output.trim()}`.trim()))
    })
  })
}

export async function exportMxfWithMappedAudio(
  request: ExportJobRequest,
  settings: EventPipeSettings,
  onProgress?: (update: ExportProgressUpdate) => void,
): Promise<ExportJobResult> {
  const sourceName = path.parse(request.mxfPath).name
  const targetName = request.customFileName
    ? `${sanitizeFileNameSegment(request.customFileName)}.mxf`
    : `${sanitizeFileNameSegment(applyNamingPreset(settings.namingPreset, sourceName))}.mxf`

  await fs.mkdir(settings.tempExportFolder, { recursive: true })

  const outputPath = path.join(settings.tempExportFolder, targetName)
  const args = buildFfmpegArgs(request.mxfPath, request.wavPath, request.mapping, outputPath)
  const wavProbe = await analyzeWavWithFfprobe(request.wavPath, settings.ffprobePath)

  try {
    const log = await runFfmpeg(settings.ffmpegPath, args, wavProbe.durationSeconds, onProgress)
    // Publish step moves the finished export into watchfolder for downstream systems.
    const published = await publishToWatchFolder(outputPath, settings.watchFolder)
    const logPath = await writeExportLog(sourceName, settings, log, 'success')

    return {
      outputPath: published.publishedPath,
      tempOutputPath: outputPath,
      publishedPath: published.publishedPath,
      publishConflictResolved: published.conflictResolved,
      command: settings.ffmpegPath,
      args,
      log,
      logPath,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const logPath = await writeExportLog(sourceName, settings, message, 'error')
    throw new Error(`Export failed. Log: ${logPath}\n${message}`)
  }
}
