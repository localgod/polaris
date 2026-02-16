import parse from 'spdx-expression-parse'

interface ParsedLicense {
  id: string
  expression: string | null
}

/**
 * Check if a string looks like an SPDX compound expression (contains AND/OR operators).
 */
export function isCompoundExpression(id: string): boolean {
  return /\b(AND|OR)\b/.test(id)
}

/**
 * Parse an SPDX license expression and extract individual license IDs.
 * For simple IDs (e.g. "MIT"), returns a single entry with no expression.
 * For compound expressions (e.g. "(MIT OR Apache-2.0)"), returns one entry
 * per individual license with the original expression attached.
 *
 * Falls back to returning the raw string if parsing fails.
 */
export function parseLicenseExpression(id: string): ParsedLicense[] {
  if (!id) return []

  if (!isCompoundExpression(id)) {
    return [{ id, expression: null }]
  }

  try {
    const tree = parse(id)
    const licenses = extractLicenseIds(tree)
    // Deduplicate (same license can appear in nested expressions)
    const unique = [...new Set(licenses)]
    return unique.map(licenseId => ({ id: licenseId, expression: id }))
  } catch {
    // If parsing fails, treat the whole string as a single license
    return [{ id, expression: null }]
  }
}

type SpdxNode =
  | { license: string; plus?: boolean }
  | { conjunction: string; left: SpdxNode; right: SpdxNode }

function extractLicenseIds(node: SpdxNode): string[] {
  if ('license' in node) {
    return [node.license]
  }
  return [...extractLicenseIds(node.left), ...extractLicenseIds(node.right)]
}
