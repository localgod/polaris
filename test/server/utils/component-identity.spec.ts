import { describe, it, expect } from 'vitest'
import { decodeComponentKey, encodeComponentKey } from '../../../utils/component-identity'

describe('component identity helpers', () => {
  it('uses purl as the preferred stable identity', () => {
    const key = encodeComponentKey({
      purl: 'pkg:npm/react@18.2.0',
      packageManager: 'npm',
      group: null,
      name: 'react',
      version: '18.2.0'
    })

    expect(decodeComponentKey(key)).toEqual({ purl: 'pkg:npm/react@18.2.0' })
  })

  it('falls back to package manager, group, name, and version', () => {
    const key = encodeComponentKey({
      purl: null,
      packageManager: 'maven',
      group: 'org.example',
      name: 'library',
      version: '1.2.3'
    })

    expect(decodeComponentKey(key)).toEqual({
      packageManager: 'maven',
      group: 'org.example',
      name: 'library',
      version: '1.2.3'
    })
  })

  it('returns null for malformed keys', () => {
    expect(decodeComponentKey('not-a-valid-key')).toBeNull()
  })
})
