/**
 * Normalize a `getQuery()` value into a single trimmed search string.
 *
 * h3 returns `string[]` for repeated query params (e.g. `?search=a&search=b`);
 * passing that straight into a Cypher `toLower($search)` throws at the DB layer.
 * Takes the first value when an array is given, and treats an empty/whitespace
 * string as no search.
 */
export function parseSearchParam(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  return trimmed.length > 0 ? trimmed : undefined
}
