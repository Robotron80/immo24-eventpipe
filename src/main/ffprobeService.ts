import { spawn } from 'node:child_process'

import type { MxfProbeData, WavProbeData } from '../shared/types'

interface FfprobeJson {
  streams?: Array<{
    codec_type?: string
    codec_name?: string
    channels?: number
    channel_layout?: string
    sample_rate?: string
    bits_per_sample?: number
    duration?: string
    tags?: Record<string, string>
  }>
  format?: {
    duration?: string
    tags?: Record<string, string>
  }
}

function normalizeTags(tags?: Record<string, string>): Record<string, string> {
  if (!tags) {
    return {}
  }

  const normalized: Record<string, string> = {}
  for (const [key, value] of Object.entries(tags)) {
    normalized[key.toLowerCase()] = value
  }
  return normalized
}

export async function analyzeWavWithFfprobe(wavPath: string, ffprobePath: string): Promise<WavProbeData> {
  return new Promise((resolve, reject) => {
    const args = [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_streams',
      '-show_format',
      wavPath,
    ]

    const child = spawn(ffprobePath, args, { stdio: ['ignore', 'pipe', 'pipe'] })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => {
      reject(new Error(`Unable to start ffprobe: ${error.message}`))
    })

    child.on('close', (code) => {
      if (code !== 0) {
        const details = stderr.trim()

        if (/invalid data found when processing input/i.test(details)) {
          reject(new Error('Die ausgewählte Datei ist kein lesbares WAV.'))
          return
        }

        reject(new Error('Die ausgewählte Datei ist kein lesbares WAV oder verwendet ein nicht unterstütztes Audioformat.'))
        return
      }

      try {
        const parsed = JSON.parse(stdout) as FfprobeJson
        const audioStream = parsed.streams?.find((stream) => typeof stream.channels === 'number')

        if (!audioStream || typeof audioStream.channels !== 'number') {
          reject(new Error('Die ausgewählte Datei ist kein lesbares WAV oder enthält keinen verwertbaren Audiostream.'))
          return
        }

        const probeData: WavProbeData = {
          channels: audioStream.channels,
          channelLayout: audioStream.channel_layout,
          sampleRate: audioStream.sample_rate ? Number(audioStream.sample_rate) : undefined,
          bitsPerSample: audioStream.bits_per_sample,
          durationSeconds: audioStream.duration ? Number(audioStream.duration) : parsed.format?.duration ? Number(parsed.format.duration) : undefined,
          codecName: audioStream.codec_name,
          streamTags: normalizeTags(audioStream.tags),
          formatTags: normalizeTags(parsed.format?.tags),
        }

        resolve(probeData)
      } catch (error) {
        reject(new Error(`Could not parse ffprobe output: ${(error as Error).message}`))
      }
    })
  })
}

export async function analyzeMxfWithFfprobe(mxfPath: string, ffprobePath: string): Promise<MxfProbeData> {
  return new Promise((resolve, reject) => {
    const args = [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_streams',
      '-show_format',
      mxfPath,
    ]

    const child = spawn(ffprobePath, args, { stdio: ['ignore', 'pipe', 'pipe'] })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => {
      reject(new Error(`Unable to start ffprobe: ${error.message}`))
    })

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}: ${stderr.trim()}`))
        return
      }

      try {
        const parsed = JSON.parse(stdout) as FfprobeJson
        const streams = parsed.streams ?? []
        const videoStream = streams.find((stream) => stream.codec_type === 'video')
        const audioStreams = streams.filter((stream) => stream.codec_type === 'audio')

        if (!videoStream) {
          reject(new Error('No video stream found in MXF file'))
          return
        }

        resolve({
          durationSeconds: parsed.format?.duration ? Number(parsed.format.duration) : undefined,
          videoCodecName: videoStream.codec_name,
          audioStreamCount: audioStreams.length,
          streamCount: streams.length,
          formatTags: normalizeTags(parsed.format?.tags),
        })
      } catch (error) {
        reject(new Error(`Could not parse ffprobe output: ${(error as Error).message}`))
      }
    })
  })
}
