import { describe, it, expect } from 'vitest'
import { isCompoundExpression, parseLicenseExpression } from '../../../server/utils/license-expression'

describe('[contract] isCompoundExpression', () => {
  it('returns false for a simple SPDX id', () => {
    expect(isCompoundExpression('MIT')).toBe(false)
  })

  it('returns true for an OR expression', () => {
    expect(isCompoundExpression('MIT OR Apache-2.0')).toBe(true)
  })

  it('returns true for an AND expression', () => {
    expect(isCompoundExpression('MIT AND Apache-2.0')).toBe(true)
  })

  it('is case-sensitive — lowercase and/or are not operators', () => {
    expect(isCompoundExpression('MIT or Apache-2.0')).toBe(false)
    expect(isCompoundExpression('MIT and Apache-2.0')).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isCompoundExpression('')).toBe(false)
  })
})

describe('[contract] parseLicenseExpression', () => {
  it('returns empty array for an empty string', () => {
    expect(parseLicenseExpression('')).toEqual([])
  })

  it('returns a single entry with null expression for a simple id', () => {
    expect(parseLicenseExpression('MIT')).toEqual([{ id: 'MIT', expression: null }])
  })

  it('parses an OR expression into individual licenses', () => {
    const result = parseLicenseExpression('MIT OR Apache-2.0')
    expect(result).toHaveLength(2)
    expect(result.map(r => r.id)).toContain('MIT')
    expect(result.map(r => r.id)).toContain('Apache-2.0')
    expect(result[0]!.expression).toBe('MIT OR Apache-2.0')
  })

  it('parses an AND expression into individual licenses', () => {
    const result = parseLicenseExpression('MIT AND Apache-2.0')
    expect(result).toHaveLength(2)
    expect(result.map(r => r.id)).toContain('MIT')
    expect(result.map(r => r.id)).toContain('Apache-2.0')
  })

  it('deduplicates licenses that appear multiple times', () => {
    const result = parseLicenseExpression('MIT OR MIT')
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('MIT')
  })

  it('falls back to a single entry when parsing fails', () => {
    // An invalid SPDX expression that the parser cannot handle
    const result = parseLicenseExpression('NOT-VALID AND')
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('NOT-VALID AND')
    expect(result[0]!.expression).toBeNull()
  })
})
