import { describe, it, expect } from 'vitest'
import {
  parseDataTable,
  parseDataTableAsObject,
  parseDataTableAsFirstRow,
  parseDataTableAuto,
  createDataTableStep,
  createDataTableObjectStep
} from './data-table-parser'

describe('Data Table Parser', () => {
  describe('parseDataTable', () => {
    it('should parse multi-row data table', () => {
      const table = `
        | name    | email              |
        | Alice   | alice@example.com  |
        | Bob     | bob@example.com    |
      `
      
      const result = parseDataTable(table)
      
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ name: 'Alice', email: 'alice@example.com' })
      expect(result[1]).toEqual({ name: 'Bob', email: 'bob@example.com' })
    })

    it('should parse key-value data table', () => {
      const table = `
        | field      | value       |
        | operation  | CREATE      |
        | userId     | user123     |
      `
      
      const result = parseDataTable(table)
      
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ field: 'operation', value: 'CREATE' })
      expect(result[1]).toEqual({ field: 'userId', value: 'user123' })
    })

    it('should handle tables with spaces in values', () => {
      const table = `
        | name           | description                    |
        | Backend Team   | Team managing backend services |
        | Frontend Team  | Team managing UI components    |
      `
      
      const result = parseDataTable(table)
      
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Backend Team')
      expect(result[0].description).toBe('Team managing backend services')
    })

    it('should return empty array for empty string', () => {
      expect(parseDataTable('')).toEqual([])
    })

    it('should return empty array for invalid input', () => {
      expect(parseDataTable('not a table')).toEqual([])
    })

    it('should handle single data row', () => {
      const table = `
        | status   | versionConstraint |
        | approved | >=17              |
      `
      
      const result = parseDataTable(table)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ status: 'approved', versionConstraint: '>=17' })
    })

    it('should handle tables with special characters', () => {
      const table = `
        | field              | value          |
        | versionConstraint  | >=11 <21       |
        | notes              | Use with care! |
      `
      
      const result = parseDataTable(table)
      
      expect(result[0].value).toBe('>=11 <21')
      expect(result[1].value).toBe('Use with care!')
    })

    it('should skip malformed rows', () => {
      const table = `
        | name  | email           |
        | Alice | alice@test.com  |
        | Bob   |                 |
        | Carol | carol@test.com  |
      `
      
      const result = parseDataTable(table)
      
      // Bob's row should be skipped due to missing email
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Alice')
      expect(result[1].name).toBe('Carol')
    })
  })

  describe('parseDataTableAsObject', () => {
    it('should convert field-value table to object', () => {
      const table = `
        | field      | value       |
        | operation  | CREATE      |
        | entityType | Technology  |
        | userId     | user123     |
      `
      
      const result = parseDataTableAsObject(table)
      
      expect(result).toEqual({
        operation: 'CREATE',
        entityType: 'Technology',
        userId: 'user123'
      })
    })

    it('should handle key-value format', () => {
      const table = `
        | key       | value      |
        | username  | john       |
        | password  | secret123  |
      `
      
      const result = parseDataTableAsObject(table)
      
      expect(result).toEqual({
        username: 'john',
        password: 'secret123'
      })
    })

    it('should return empty object for non-key-value table', () => {
      const table = `
        | name  | email           |
        | Alice | alice@test.com  |
      `
      
      const result = parseDataTableAsObject(table)
      
      expect(result).toEqual({})
    })

    it('should return empty object for empty string', () => {
      expect(parseDataTableAsObject('')).toEqual({})
    })
  })

  describe('parseDataTableAsFirstRow', () => {
    it('should return first row as object', () => {
      const table = `
        | status   | versionConstraint |
        | approved | >=17              |
      `
      
      const result = parseDataTableAsFirstRow(table)
      
      expect(result).toEqual({ status: 'approved', versionConstraint: '>=17' })
    })

    it('should ignore additional rows', () => {
      const table = `
        | name  | email           |
        | Alice | alice@test.com  |
        | Bob   | bob@test.com    |
      `
      
      const result = parseDataTableAsFirstRow(table)
      
      expect(result).toEqual({ name: 'Alice', email: 'alice@test.com' })
    })

    it('should return empty object for empty table', () => {
      expect(parseDataTableAsFirstRow('')).toEqual({})
    })
  })

  describe('parseDataTableAuto', () => {
    it('should detect field-value format and return object', () => {
      const table = `
        | field      | value       |
        | operation  | CREATE      |
        | userId     | user123     |
      `
      
      const result = parseDataTableAuto(table)
      
      expect(result).toEqual({
        operation: 'CREATE',
        userId: 'user123'
      })
    })

    it('should return array for multi-row non-key-value table', () => {
      const table = `
        | name  | email           |
        | Alice | alice@test.com  |
        | Bob   | bob@test.com    |
      `
      
      const result = parseDataTableAuto(table)
      
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
    })

    it('should return empty array for empty input', () => {
      expect(parseDataTableAuto('')).toEqual([])
    })
  })

  describe('createDataTableStep', () => {
    it('should create step handler that parses data table', async () => {
      const table = `
        | name  | email           |
        | Alice | alice@test.com  |
      `
      
      let capturedData: any = null
      const handler = createDataTableStep(async (data) => {
        capturedData = data
      })
      
      await handler(table)
      
      expect(capturedData).toHaveLength(1)
      expect(capturedData[0]).toEqual({ name: 'Alice', email: 'alice@test.com' })
    })

    it('should handle undefined data table', async () => {
      let capturedData: any = null
      const handler = createDataTableStep(async (data) => {
        capturedData = data
      })
      
      await handler(undefined)
      
      expect(capturedData).toEqual([])
    })

    it('should work with sync handler', () => {
      const table = `
        | name | value |
        | key1 | val1  |
      `
      
      let capturedData: any = null
      const handler = createDataTableStep((data) => {
        capturedData = data
      })
      
      handler(table)
      
      expect(capturedData).toHaveLength(1)
    })
  })

  describe('createDataTableObjectStep', () => {
    it('should create step handler that parses as object', async () => {
      const table = `
        | field      | value       |
        | operation  | CREATE      |
        | userId     | user123     |
      `
      
      let capturedData: any = null
      const handler = createDataTableObjectStep(async (data) => {
        capturedData = data
      })
      
      await handler(table)
      
      expect(capturedData).toEqual({
        operation: 'CREATE',
        userId: 'user123'
      })
    })

    it('should handle undefined data table', async () => {
      let capturedData: any = null
      const handler = createDataTableObjectStep(async (data) => {
        capturedData = data
      })
      
      await handler(undefined)
      
      expect(capturedData).toEqual({})
    })
  })

  describe('Real-world scenarios', () => {
    it('should handle approval resolution background data', () => {
      const teamsTable = `
        | name           | email                    |
        | Backend Team   | backend@example.com      |
        | Frontend Team  | frontend@example.com     |
      `
      
      const teams = parseDataTable(teamsTable)
      
      expect(teams).toHaveLength(2)
      expect(teams[0]).toEqual({ name: 'Backend Team', email: 'backend@example.com' })
      expect(teams[1]).toEqual({ name: 'Frontend Team', email: 'frontend@example.com' })
    })

    it('should handle audit log creation data', () => {
      const auditTable = `
        | field        | value                           |
        | operation    | CREATE                          |
        | entityType   | Technology                      |
        | entityId     | React                           |
        | userId       | user123                         |
        | source       | UI                              |
      `
      
      const audit = parseDataTableAsObject(auditTable)
      
      expect(audit).toEqual({
        operation: 'CREATE',
        entityType: 'Technology',
        entityId: 'React',
        userId: 'user123',
        source: 'UI'
      })
    })

    it('should handle version-specific approval data', () => {
      const approvalTable = `
        | status            | eolDate    | notes             |
        | deprecated        | 2025-06-30 | Security concerns |
      `
      
      const approval = parseDataTableAsFirstRow(approvalTable)
      
      expect(approval.status).toBe('deprecated')
      expect(approval.eolDate).toBe('2025-06-30')
      expect(approval.notes).toBe('Security concerns')
    })
  })
})
