function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Turns ">=18.0.0 <20.0.0" into "gte18.0.0-lt20.0.0" so it reads as a name segment
function slugifyVersionRange(range: string): string {
  return range
    .trim()
    .replace(/>=/g, 'gte')
    .replace(/<=/g, 'lte')
    .replace(/>/g, 'gt')
    .replace(/</g, 'lt')
    .replace(/=/g, 'eq')
    .split(/\s+/)
    .filter(Boolean)
    .join('-')
}

export interface ConstraintNameInput {
  technology?: string | null
  scope: string
  subjectTeam?: string | null
  severity?: string | null
  versionRange?: string | null
}

export function generateVersionConstraintName(input: ConstraintNameInput): string {
  const parts: string[] = []
  if (input.technology) parts.push(slugify(input.technology))
  parts.push(
    input.scope === 'team' && input.subjectTeam
      ? slugify(input.subjectTeam)
      : 'org'
  )
  if (input.severity) parts.push(input.severity)
  if (input.versionRange) parts.push(slugifyVersionRange(input.versionRange))
  return parts.filter(Boolean).join('-')
}
