import { describe, it, expect } from 'vitest'
import { parseSearchParam } from '../../../server/utils/query-params'

describe('[pin] parseSearchParam', () => {
  it('returns undefined when absent', () => {
    expect(parseSearchParam(undefined)).toBeUndefined()
  })

  it('returns the trimmed string for a normal value', () => {
    expect(parseSearchParam('  react  ')).toBe('react')
  })

  it('returns undefined for an empty or whitespace-only string', () => {
    expect(parseSearchParam('')).toBeUndefined()
    expect(parseSearchParam('   ')).toBeUndefined()
  })

  it('takes the first value when given an array (repeated query params)', () => {
    expect(parseSearchParam(['react', 'vue'])).toBe('react')
  })

  it('returns undefined for a non-string value', () => {
    expect(parseSearchParam(42)).toBeUndefined()
  })
})
