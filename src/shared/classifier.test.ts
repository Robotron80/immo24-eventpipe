import { describe, expect, it } from 'vitest'

import { classifyWav } from './classifier'
import type { WavProbeData } from './types'

describe('classifyWav', () => {
  it('classifies bounce polywav when dTRK metadata is present', () => {
    const probe: WavProbeData = {
      channels: 8,
      streamTags: {
        description:
          'dTRK1=ST Stereo-L / dTRK2=ST Stereo-R / dTRK3=IT Stereo-L / dTRK4=IT Stereo-R / dTRK5=ACF-L / dTRK6=ACF-R / dTRK7=MU-L / dTRK8=MU-R',
      },
    }

    const result = classifyWav(probe)

    expect(result.type).toBe('multitrack-wav')
    expect(result.trackNames).toEqual([
      'ST Stereo-L',
      'ST Stereo-R',
      'IT Stereo-L',
      'IT Stereo-R',
      'ACF-L',
      'ACF-R',
      'MU-L',
      'MU-R',
    ])
  })

  it('classifies legacy surround print by channel layout', () => {
    const probe: WavProbeData = {
      channels: 8,
      channelLayout: 'L R C LFE Lb Rb Ls Rs',
      streamTags: {},
      formatTags: {},
    }

    const result = classifyWav(probe)

    expect(result.type).toBe('legacy-surround-track')
    expect(result.trackNames).toEqual([])
  })

  it('returns unknown when no dTRK and no known legacy layout is present', () => {
    const probe: WavProbeData = {
      channels: 8,
      channelLayout: 'unknown',
      streamTags: {},
      formatTags: {},
    }

    const result = classifyWav(probe)

    expect(result.type).toBe('unknown')
  })

  it('extracts dTRK names from explicit tag keys', () => {
    const probe: WavProbeData = {
      channels: 4,
      streamTags: {
        dtrk1: 'L',
        dtrk2: 'R',
        dtrk3: 'M',
        dtrk4: 'S',
      },
    }

    const result = classifyWav(probe)

    expect(result.type).toBe('multitrack-wav')
    expect(result.trackNames).toEqual(['L', 'R', 'M', 'S'])
  })

  it('extracts dTRK names when tags are contiguous without slash separators', () => {
    const probe: WavProbeData = {
      channels: 8,
      streamTags: {
        description:
          'dTRK1=ST Stereo-L dTRK2=ST Stereo-R dTRK3=IT Stereo-L dTRK4=IT Stereo-R dTRK5=ACF-L dTRK6=ACF-R dTRK7=MU-L dTRK8=MU-R',
      },
    }

    const result = classifyWav(probe)

    expect(result.type).toBe('multitrack-wav')
    expect(result.trackNames).toEqual([
      'ST Stereo-L',
      'ST Stereo-R',
      'IT Stereo-L',
      'IT Stereo-R',
      'ACF-L',
      'ACF-R',
      'MU-L',
      'MU-R',
    ])
  })

  it('extracts dTRK names from keys with accidental spaces', () => {
    const probe: WavProbeData = {
      channels: 8,
      streamTags: {
        'dTRK1 ': 'ST Stereo-L',
        ' dTRK2': 'ST Stereo-R',
        'dTRK3 ': 'IT Stereo-L',
        ' dTRK4 ': 'IT Stereo-R',
        dTRK5: 'ACF-L',
        dTRK6: 'ACF-R',
        dTRK7: 'MU-L',
        'dTRK8 ': 'MU-R',
      },
    }

    const result = classifyWav(probe)

    expect(result.type).toBe('multitrack-wav')
    expect(result.trackNames).toEqual([
      'ST Stereo-L',
      'ST Stereo-R',
      'IT Stereo-L',
      'IT Stereo-R',
      'ACF-L',
      'ACF-R',
      'MU-L',
      'MU-R',
    ])
  })

  it('stops last dTRK name before trailing key-value metadata', () => {
    const probe: WavProbeData = {
      channels: 8,
      streamTags: {
        description:
          'dTRK1=ST Stereo-L dTRK2=ST Stereo-R dTRK3=IT Stereo-L dTRK4=IT Stereo-R dTRK5=ACF-L dTRK6=ACF-R dTRK7=MU-L dTRK8=MU-R | encoded_by=Pro Tools | originator_reference=abc123',
      },
    }

    const result = classifyWav(probe)

    expect(result.type).toBe('multitrack-wav')
    expect(result.trackNames[7]).toBe('MU-R')
  })

  it('stops last dTRK name before trailing metadata without pipe separator', () => {
    const probe: WavProbeData = {
      channels: 8,
      streamTags: {
        description:
          'dTRK1=ST Stereo-L dTRK2=ST Stereo-R dTRK3=IT Stereo-L dTRK4=IT Stereo-R dTRK5=ACF-L dTRK6=ACF-R dTRK7=MU-L dTRK8=MU-R encoded_by=Pro Tools originator_reference=abc123',
      },
    }

    const result = classifyWav(probe)

    expect(result.type).toBe('multitrack-wav')
    expect(result.trackNames[7]).toBe('MU-R')
  })

  it('classifies plain stereo WAV without dTRK as legacy', () => {
    const probe: WavProbeData = {
      channels: 2,
      streamTags: {},
      formatTags: {},
    }

    const result = classifyWav(probe)

    expect(result.type).toBe('legacy-surround-track')
  })

  it('classifies plain quad WAV without dTRK as legacy', () => {
    const probe: WavProbeData = {
      channels: 4,
      streamTags: {},
      formatTags: {},
    }

    const result = classifyWav(probe)

    expect(result.type).toBe('legacy-surround-track')
  })
})
