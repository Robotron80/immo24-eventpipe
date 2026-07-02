import { describe, expect, it } from 'vitest'

import { buildBounceMapping, buildLegacyMapping } from './mapping'

describe('mapping', () => {
  it('keeps bounce mapping order and assigns dTRK names', () => {
    const names = [
      'ST Stereo-L',
      'ST Stereo-R',
      'IT Stereo-L',
      'IT Stereo-R',
      'ACF-L',
      'ACF-R',
      'MU-L',
      'MU-R',
    ]

    const mapping = buildBounceMapping(8, names)

    expect(mapping).toHaveLength(8)
    expect(mapping.map((row) => row.mxfTrack)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(mapping.map((row) => row.wavChannel)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(mapping.map((row) => row.name)).toEqual(names)
  })

  it('builds legacy 8ch mapping from reference script order', () => {
    const mapping = buildLegacyMapping(8)

    expect(mapping.map((row) => row.mxfTrack)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(mapping.map((row) => row.wavChannel)).toEqual([1, 3, 2, 7, 8, 5, 6, 4])
  })

  it('builds legacy 6ch mapping from reference script order', () => {
    const mapping = buildLegacyMapping(6)

    expect(mapping.map((row) => row.mxfTrack)).toEqual([1, 2, 3, 4, 5, 6])
    expect(mapping.map((row) => row.wavChannel)).toEqual([1, 3, 2, 5, 6, 4])
  })
})
