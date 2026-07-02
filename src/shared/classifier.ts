import { isSupportedChannelCount } from './mapping'
import type { WavClassificationResult, WavProbeData } from './types'

function normalizeTags(probe: WavProbeData): string {
  const values: string[] = []

  for (const [key, value] of Object.entries(probe.streamTags ?? {})) {
    values.push(`${key}=${value}`)
  }

  for (const [key, value] of Object.entries(probe.formatTags ?? {})) {
    values.push(`${key}=${value}`)
  }

  return values.join(' | ').toLowerCase()
}

function extractDtrkNames(probe: WavProbeData): string[] {
  const cleanName = (value: string): string => value.trim().replace(/[\s/|,;:-]+$/g, '').trim()
  const stripMetadataTail = (value: string): string =>
    value
      .replace(/\s*\|\s*[a-z_][a-z0-9_ -]*\s*=.*$/i, '')
      .replace(/\s+[a-z_][a-z0-9_ -]*\s*=.*$/i, '')
      .trim()

  const dtrkByIndex = new Map<number, string>()
  const allTagEntries = [
    ...Object.entries(probe.streamTags ?? {}),
    ...Object.entries(probe.formatTags ?? {}),
  ]

  const combinedText = allTagEntries.map(([key, value]) => `${key}=${value}`).join(' | ')
  const tokenMatches = [...combinedText.matchAll(/dTRK\s*(\d+)\s*=/gi)]

  for (let index = 0; index < tokenMatches.length; index += 1) {
    const current = tokenMatches[index]
    const next = tokenMatches[index + 1]

    if (current.index === undefined) {
      continue
    }

    const valueStart = current.index + current[0].length
    const valueEnd = next?.index ?? combinedText.length
    const rawValue = combinedText.slice(valueStart, valueEnd)
    const trackIndex = Number(current[1])
    const name = cleanName(stripMetadataTail(rawValue))

    if (name) {
      dtrkByIndex.set(trackIndex, name)
    }
  }

  for (const [key, value] of allTagEntries) {
    const keyMatch = key.match(/^\s*dtrk\s*(\d+)\s*$/i)
    if (keyMatch && value.trim()) {
      dtrkByIndex.set(Number(keyMatch[1]), cleanName(stripMetadataTail(value)))
    }
  }

  return [...dtrkByIndex.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, name]) => name)
}

export function classifyWav(probe: WavProbeData): WavClassificationResult {
  if (!isSupportedChannelCount(probe.channels)) {
    return {
      type: 'unknown',
      trackNames: [],
      reason: `Unsupported channel count: ${probe.channels}`,
    }
  }

  const dtrkNames = extractDtrkNames(probe)
  if (dtrkNames.length > 0) {
    return {
      type: 'bounce-polywav',
      trackNames: dtrkNames,
      reason: 'dTRK metadata detected',
    }
  }

  const tagBlob = normalizeTags(probe)
  const layout = (probe.channelLayout ?? '').toLowerCase()
  const legacyLayoutDetected =
    layout.includes('l r c lfe lb rb ls rs') ||
    layout.includes('l r c lfe ls rs') ||
    layout.includes('l r ls rs') ||
    layout.includes('7.1') ||
    layout.includes('5.1') ||
    tagBlob.includes('l r c lfe lb rb ls rs')

  if (legacyLayoutDetected) {
    return {
      type: 'legacy-surround-print',
      trackNames: [],
      reason: 'Legacy surround channel layout detected',
    }
  }

  if (probe.channels === 2 || probe.channels === 4) {
    return {
      type: 'legacy-surround-print',
      trackNames: [],
      reason: 'No dTRK metadata found for stereo/quad WAV, defaulting to legacy mapping',
    }
  }

  return {
    type: 'unknown',
    trackNames: [],
    reason: 'No dTRK metadata and no known legacy layout found',
  }
}
