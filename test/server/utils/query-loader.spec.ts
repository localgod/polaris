import { describe, it, expect, beforeEach } from 'vitest'
import { injectOrderBy, injectWhereConditions, clearQueryCache } from '../../../server/utils/query-loader'

beforeEach(() => {
  clearQueryCache()
})

describe('[pin] injectOrderBy', () => {
  it('replaces the {{ORDER_BY}} placeholder', () => {
    const query = 'MATCH (n) RETURN n ORDER BY {{ORDER_BY}}'
    expect(injectOrderBy(query, 'n.name ASC')).toBe('MATCH (n) RETURN n ORDER BY n.name ASC')
  })

  it('leaves the query unchanged when the placeholder is absent', () => {
    const query = 'MATCH (n) RETURN n'
    expect(injectOrderBy(query, 'n.name ASC')).toBe('MATCH (n) RETURN n')
  })
})

describe('[pin] injectWhereConditions', () => {
  it('replaces {{WHERE_CONDITIONS}} with a WHERE clause', () => {
    const query = 'MATCH (n) {{WHERE_CONDITIONS}} RETURN n'
    const result = injectWhereConditions(query, ['n.active = true'])
    expect(result).toBe('MATCH (n) WHERE n.active = true RETURN n')
  })

  it('joins multiple conditions with AND', () => {
    const query = 'MATCH (n) {{WHERE_CONDITIONS}} RETURN n'
    const result = injectWhereConditions(query, ['n.active = true', 'n.type = "system"'])
    expect(result).toBe('MATCH (n) WHERE n.active = true AND n.type = "system" RETURN n')
  })

  it('removes the placeholder when conditions array is empty', () => {
    const query = 'MATCH (n) {{WHERE_CONDITIONS}} RETURN n'
    const result = injectWhereConditions(query, [])
    expect(result).toBe('MATCH (n)  RETURN n')
  })

  it('replaces {{AND_CONDITIONS}} with an AND clause', () => {
    const query = 'MATCH (n) WHERE n.base = 1 {{AND_CONDITIONS}} RETURN n'
    const result = injectWhereConditions(query, ['n.active = true'])
    expect(result).toBe('MATCH (n) WHERE n.base = 1 AND n.active = true RETURN n')
  })

  it('removes {{AND_CONDITIONS}} when conditions array is empty', () => {
    const query = 'MATCH (n) WHERE n.base = 1 {{AND_CONDITIONS}} RETURN n'
    const result = injectWhereConditions(query, [])
    expect(result).toBe('MATCH (n) WHERE n.base = 1  RETURN n')
  })
})
