/**
 * Data Table Parser for Gherkin Tests
 * 
 * Parses Gherkin data tables (passed as strings from vitest-cucumber)
 * into structured JavaScript objects for use in test scenarios.
 * 
 * @example
 * ```gherkin
 * When I create an audit log with:
 *   | field      | value       |
 *   | operation  | CREATE      |
 *   | entityType | Technology  |
 * ```
 * 
 * ```typescript
 * When('I create an audit log with:', (dataTableStr: string) => {
 *   const rows = parseDataTable(dataTableStr)
 *   // rows = [{ field: 'operation', value: 'CREATE' }, { field: 'entityType', value: 'Technology' }]
 * })
 * ```
 */

/**
 * Represents a single row in a data table as a key-value object
 */
export interface DataTableRow {
  [key: string]: string
}

/**
 * Parse a Gherkin data table string into an array of row objects
 * 
 * Handles both formats:
 * - Multi-row tables: Each row becomes an object with column headers as keys
 * - Single-row key-value tables: Returns array with one object
 * 
 * @param tableString - The raw data table string from vitest-cucumber
 * @returns Array of objects representing each data row
 * 
 * @example
 * // Multi-row table
 * const table = `
 *   | name    | email              |
 *   | Alice   | alice@example.com  |
 *   | Bob     | bob@example.com    |
 * `
 * parseDataTable(table)
 * // Returns: [
 * //   { name: 'Alice', email: 'alice@example.com' },
 * //   { name: 'Bob', email: 'bob@example.com' }
 * // ]
 * 
 * @example
 * // Key-value table
 * const table = `
 *   | field      | value       |
 *   | operation  | CREATE      |
 *   | userId     | user123     |
 * `
 * parseDataTable(table)
 * // Returns: [
 * //   { field: 'operation', value: 'CREATE' },
 * //   { field: 'userId', value: 'user123' }
 * // ]
 */
export function parseDataTable(tableString: string): DataTableRow[] {
  if (!tableString || typeof tableString !== 'string') {
    return []
  }

  // Split into lines and filter out empty lines
  const lines = tableString
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && line.includes('|'))

  if (lines.length < 2) {
    return []
  }

  // Extract headers from first line
  const headers = lines[0]
    .split('|')
    .map(h => h.trim())
    .filter(Boolean)

  if (headers.length === 0) {
    return []
  }

  // Parse data rows (all lines after header)
  const rows: DataTableRow[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i]
      .split('|')
      .map(v => v.trim())
      .filter(Boolean)

    // Skip rows that don't have the right number of columns
    if (values.length !== headers.length) {
      continue
    }

    const row: DataTableRow = {}
    headers.forEach((header, index) => {
      row[header] = values[index]
    })
    rows.push(row)
  }

  return rows
}

/**
 * Convert a data table with 'field' and 'value' columns into a single object
 * 
 * This is useful for tables that represent key-value pairs:
 * | field      | value       |
 * | operation  | CREATE      |
 * | userId     | user123     |
 * 
 * @param tableString - The raw data table string
 * @returns Single object with fields as keys and values as values
 * 
 * @example
 * const table = `
 *   | field      | value       |
 *   | operation  | CREATE      |
 *   | userId     | user123     |
 * `
 * parseDataTableAsObject(table)
 * // Returns: { operation: 'CREATE', userId: 'user123' }
 */
export function parseDataTableAsObject(tableString: string): Record<string, string> {
  const rows = parseDataTable(tableString)
  const result: Record<string, string> = {}

  for (const row of rows) {
    // Look for common key-value column names
    const key = row.field || row.key || row.name || row.property
    const value = row.value || row.val

    if (key && value !== undefined) {
      result[key] = value
    }
  }

  return result
}

/**
 * Parse a data table where the first row contains field names and second row contains values
 * 
 * This handles single-object tables where column headers are the field names:
 * | status   | versionConstraint |
 * | approved | >=17              |
 * 
 * @param tableString - The raw data table string
 * @returns Single object with column headers as keys
 * 
 * @example
 * const table = `
 *   | status   | versionConstraint |
 *   | approved | >=17              |
 * `
 * parseDataTableAsFirstRow(table)
 * // Returns: { status: 'approved', versionConstraint: '>=17' }
 */
export function parseDataTableAsFirstRow(tableString: string): Record<string, string> {
  const rows = parseDataTable(tableString)
  return rows.length > 0 ? rows[0] : {}
}

/**
 * Parse a data table and convert to an array of objects, supporting multiple formats
 * 
 * Auto-detects format:
 * - If table has 2 columns named 'field'/'key' and 'value', converts to single object
 * - Otherwise returns array of row objects
 * 
 * @param tableString - The raw data table string
 * @returns Either array of objects or single object depending on format
 */
export function parseDataTableAuto(tableString: string): DataTableRow[] | Record<string, string> {
  const rows = parseDataTable(tableString)
  
  if (rows.length === 0) {
    return []
  }

  // Check if this is a key-value format table
  const firstRow = rows[0]
  const keys = Object.keys(firstRow)
  
  if (keys.length === 2) {
    const hasFieldValue = (keys.includes('field') || keys.includes('key')) && keys.includes('value')
    if (hasFieldValue) {
      return parseDataTableAsObject(tableString)
    }
  }

  return rows
}

/**
 * Helper to create a step handler that parses data tables
 * 
 * @param handler - Function that receives parsed data table rows
 * @returns Step function that parses the data table string before calling handler
 * 
 * @example
 * When('I create teams:', createDataTableStep(async (teams) => {
 *   for (const team of teams) {
 *     await createTeam(team.name, team.email)
 *   }
 * }))
 */
export function createDataTableStep(
  handler: (data: DataTableRow[]) => void | Promise<void>
): (dataTable?: string) => void | Promise<void> {
  return async (dataTable?: string) => {
    const parsed = dataTable ? parseDataTable(dataTable) : []
    await handler(parsed)
  }
}

/**
 * Helper to create a step handler that parses data tables as a single object
 * 
 * @param handler - Function that receives parsed data table as object
 * @returns Step function that parses the data table string before calling handler
 * 
 * @example
 * When('I create approval with:', createDataTableObjectStep(async (data) => {
 *   await createApproval(data.status, data.versionConstraint)
 * }))
 */
export function createDataTableObjectStep(
  handler: (data: Record<string, string>) => void | Promise<void>
): (dataTable?: string) => void | Promise<void> {
  return async (dataTable?: string) => {
    const parsed = dataTable ? parseDataTableAsObject(dataTable) : {}
    await handler(parsed)
  }
}
