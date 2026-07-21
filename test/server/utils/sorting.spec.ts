import { describe, it, expect } from 'vitest'
import { buildOrderByClause, parseSortParams } from '../../../server/utils/sorting'
import type { SortConfig } from '../../../server/utils/sorting'

const config: SortConfig = {
  allowedFields: {
    name: 's.name',
    createdAt: 's.createdAt',
  },
  defaultOrderBy: 's.name ASC',
}

describe('[contract] buildOrderByClause', () => {
  it('returns the default when sortBy is absent', () => {
    expect(buildOrderByClause({}, config)).toBe('s.name ASC')
  })

  it('returns the default when sortBy is not in the allowlist', () => {
    expect(buildOrderByClause({ sortBy: 'unknown' }, config)).toBe('s.name ASC')
  })

  it('builds an ASC clause for a valid field', () => {
    expect(buildOrderByClause({ sortBy: 'name', sortOrder: 'asc' }, config)).toBe('s.name ASC')
  })

  it('builds a DESC clause when sortOrder is desc', () => {
    expect(buildOrderByClause({ sortBy: 'name', sortOrder: 'desc' }, config)).toBe('s.name DESC')
  })

  it('defaults to ASC when sortOrder is omitted', () => {
    expect(buildOrderByClause({ sortBy: 'createdAt' }, config)).toBe('s.createdAt ASC')
  })

  it('uses the mapped Cypher expression, not the raw client field name', () => {
    const result = buildOrderByClause({ sortBy: 'createdAt', sortOrder: 'desc' }, config)
    expect(result).toBe('s.createdAt DESC')
    expect(result).toMatch(/^s\./)
  })
})

describe('[pin] parseSortParams', () => {
  it('returns sortBy and asc order from query params', () => {
    const result = parseSortParams({ sortBy: 'name', sortOrder: 'asc' })
    expect(result).toEqual({ sortBy: 'name', sortOrder: 'asc' })
  })

  it('returns desc order when sortOrder is desc', () => {
    const result = parseSortParams({ sortBy: 'name', sortOrder: 'desc' })
    expect(result).toEqual({ sortBy: 'name', sortOrder: 'desc' })
  })

  it('defaults to asc for an unrecognised sortOrder value', () => {
    const result = parseSortParams({ sortBy: 'name', sortOrder: 'random' })
    expect(result.sortOrder).toBe('asc')
  })

  it('returns undefined sortBy when absent', () => {
    const result = parseSortParams({})
    expect(result.sortBy).toBeUndefined()
  })

  it('normalises sortOrder to lowercase', () => {
    const result = parseSortParams({ sortOrder: 'DESC' })
    expect(result.sortOrder).toBe('desc')
  })
})
