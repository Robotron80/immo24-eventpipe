import type { AudioMappingEntry, SupportedChannelCount } from './types'

const LEGACY_MAPPING: Record<SupportedChannelCount, number[]> = {
  2: [1, 2],
  4: [1, 2, 3, 4],
  6: [1, 3, 2, 5, 6, 4],
  8: [1, 3, 2, 7, 8, 5, 6, 4],
}

export const SUPPORTED_CHANNEL_COUNTS = [2, 4, 6, 8] as const

export function isSupportedChannelCount(value: number): value is SupportedChannelCount {
  return SUPPORTED_CHANNEL_COUNTS.includes(value as SupportedChannelCount)
}

export function buildBounceMapping(channels: SupportedChannelCount, trackNames: string[] = []): AudioMappingEntry[] {
  return Array.from({ length: channels }, (_, index) => ({
    mxfTrack: index + 1,
    wavChannel: index + 1,
    name: trackNames[index],
  }))
}

export function buildLegacyMapping(channels: SupportedChannelCount): AudioMappingEntry[] {
  return LEGACY_MAPPING[channels].map((wavChannel, index) => ({
    mxfTrack: index + 1,
    wavChannel,
  }))
}
