import { describe, it, expect } from 'vitest'
import neo4j from 'neo4j-driver'
import { toDateString, getFirstRecordOrThrow } from '../../../server/utils/neo4j'
import type { Record as Neo4jRecord } from 'neo4j-driver'

describe('toDateString', () => {
  it('returns null for null', () => {
    expect(toDateString(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(toDateString(undefined)).toBeNull()
  })

  it('returns a string value as-is', () => {
    expect(toDateString('2024-03-15')).toBe('2024-03-15')
  })

  it('returns an empty string value as-is', () => {
    expect(toDateString('')).toBe('')
  })

  it('returns null for an unrecognised value', () => {
    expect(toDateString(42)).toBeNull()
    expect(toDateString({ year: 2024, month: 3, day: 15 })).toBeNull()
  })

  it('converts a Neo4j Date to an ISO date string', () => {
    const date = new neo4j.types.Date(2024, 3, 15)
    expect(toDateString(date)).toBe('2024-03-15')
  })

  it('converts a Neo4j DateTime to an ISO date-time string', () => {
    const dt = new neo4j.types.DateTime(2024, 3, 15, 10, 30, 0, 0, 0)
    const result = toDateString(dt)
    expect(result).not.toBeNull()
    expect(result).toContain('2024-03-15')
  })

  it('converts a Neo4j LocalDateTime to an ISO date-time string', () => {
    const ldt = new neo4j.types.LocalDateTime(2024, 3, 15, 10, 30, 0, 0)
    const result = toDateString(ldt)
    expect(result).not.toBeNull()
    expect(result).toContain('2024-03-15')
  })
})

describe('getFirstRecordOrThrow', () => {
  it('returns the first record when the array is non-empty', () => {
    const record = { get: (key: string) => key } as unknown as Neo4jRecord
    expect(getFirstRecordOrThrow([record], 'not found')).toBe(record)
  })

  it('throws a 404 error when the array is empty', () => {
    expect(() => getFirstRecordOrThrow([], 'Thing not found')).toThrow()
    try {
      getFirstRecordOrThrow([], 'Thing not found')
    } catch (err: unknown) {
      expect((err as { statusCode: number }).statusCode).toBe(404)
      expect((err as { message: string }).message).toBe('Thing not found')
    }
  })
})
