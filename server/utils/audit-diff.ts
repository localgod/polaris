type AuditChanges = Record<string, { before: unknown; after: unknown }>

/**
 * Compute a field-level diff between two objects.
 *
 * Returns a map of field names to { before, after } for every field whose
 * value differs. null and undefined are treated as equivalent (both absent).
 * Only own enumerable properties of `after` are considered; fields present
 * only in `before` are ignored unless explicitly included via `allFields`.
 *
 * @param before - State before the change (or null for CREATE operations)
 * @param after  - State after the change (or null for DELETE operations)
 * @param allFields - Explicit list of field names to include (used for CREATE/DELETE)
 */
export function buildAuditChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  allFields?: string[]
): AuditChanges {
  const changes: AuditChanges = {}
  const fields = allFields ?? Object.keys(after ?? {})

  for (const field of fields) {
    const beforeVal = before?.[field] ?? null
    const afterVal = after?.[field] ?? null

    // Treat null and undefined as equivalent — no change
    if (beforeVal === afterVal) continue

    // Loose equality for primitive values that stringify the same way
    if (
      beforeVal !== null &&
      afterVal !== null &&
      String(beforeVal) === String(afterVal)
    ) continue

    changes[field] = { before: beforeVal, after: afterVal }
  }

  return changes
}

/**
 * Build a changes map for a CREATE operation.
 * Every non-null field gets { before: null, after: value }.
 */
export function buildCreateChanges(fields: Record<string, unknown>): AuditChanges {
  return buildAuditChanges(null, fields, Object.keys(fields))
}

/**
 * Build a changes map for a DELETE operation.
 * Every non-null field gets { before: value, after: null }.
 */
export function buildDeleteChanges(fields: Record<string, unknown>): AuditChanges {
  return buildAuditChanges(fields, null, Object.keys(fields))
}
