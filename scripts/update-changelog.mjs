/**
 * Updates CHANGELOG.md on release:
 *  1. Replaces the [Unreleased] section with a versioned entry.
 *  2. Prepends a fresh [Unreleased] section above it.
 *
 * Reads RESOLVED_VERSION and RELEASE_BODY from environment variables
 * (set by the release-drafter action in the release workflow), and optionally
 * RELEASE_DATE (YYYY-MM-DD) when adding a release published on an earlier day.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const version = process.env.RESOLVED_VERSION
const body    = process.env.RELEASE_BODY

if (!version) {
  console.error('RESOLVED_VERSION is not set')
  process.exit(1)
}

const today = process.env.RELEASE_DATE || new Date().toISOString().slice(0, 10)

let content = readFileSync('CHANGELOG.md', 'utf8')

const newSection = `## [${version}] - ${today}\n\n${(body ?? '').trim()}\n`

const unreleasedBlock = [
  '## [Unreleased]',
  '',
  '### Added',
  '',
  '### Changed',
  '',
  '### Deprecated',
  '',
  '### Removed',
  '',
  '### Fixed',
  '',
  '### Security',
  // Trailing blank line: the block is inserted directly before `\n## [x.y.z]`,
  // so without it the headings touch and markdownlint (MD022) fails.
  '',
].join('\n')

// Replace the existing [Unreleased] section with the new versioned entry.
// The `s` flag makes `.` match newlines so the section body is captured too.
content = content.replace(
  /## \[Unreleased\].*?(?=\n## \[|\s*$)/s,
  newSection,
)

// Re-insert a fresh [Unreleased] section immediately before the new entry.
const insertMarker = `\n## [${version}]`
const idx = content.indexOf(insertMarker)
if (idx !== -1) {
  content = `${content.slice(0, idx)}\n${unreleasedBlock}${content.slice(idx)}`
}

writeFileSync('CHANGELOG.md', content)
console.log(`CHANGELOG.md updated for v${version}`)
