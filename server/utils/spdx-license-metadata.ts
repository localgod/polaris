import spdxFull from 'spdx-license-list/full.js'

export type LicenseCategory = 'permissive' | 'copyleft' | 'proprietary' | 'public-domain' | 'other'

export interface SpdxLicenseMetadata {
  name: string | null
  osiApproved: boolean | null
  category: LicenseCategory | null
  /** Only set when licenseId is an id actually present in the SPDX registry — free-text names like "Public Domain" are not. */
  spdxId: string | null
}

const spdxRegistry = spdxFull as Record<string, { name: string; url?: string; osiApproved?: boolean }>

// spdx-license-list has no category field, so category is inferred from id
// patterns/known families. Best-effort — matches the taxonomy already used
// by getCategoryColor() on the frontend (permissive/copyleft/proprietary/
// public-domain/other). Anything unmatched falls back to 'other', same as
// the original hand-picked classification this replaces.
const COPYLEFT_PATTERN = /^(A?L?GPL|MPL|EPL|CDDL|EUPL|OSL|CPL|SLEEPYCAT|CECILL)/i
const PERMISSIVE_PATTERN = /^(MIT|BSD|0BSD|APACHE|ISC|ZLIB|PYTHON|BOOST|BLUEOAK|NCSA|X11)/i
const PUBLIC_DOMAIN_IDS = new Set(['CC0-1.0', 'Unlicense', 'Public Domain'])

export function classifyLicenseCategory(licenseId: string): LicenseCategory {
  if (PUBLIC_DOMAIN_IDS.has(licenseId)) return 'public-domain'
  if (COPYLEFT_PATTERN.test(licenseId)) return 'copyleft'
  if (PERMISSIVE_PATTERN.test(licenseId)) return 'permissive'
  return 'other'
}

/**
 * Look up canonical name/OSI-approval from the SPDX registry and derive a
 * category for a license id. Pass the same id used to key the License node
 * (i.e. `license.id ?? license.name`) so free-text entries without a real
 * SPDX id (e.g. "Public Domain") still get classified.
 */
export function getSpdxLicenseMetadata(licenseId: string | null | undefined): SpdxLicenseMetadata {
  if (!licenseId) return { name: null, osiApproved: null, category: null, spdxId: null }

  const entry = spdxRegistry[licenseId]
  return {
    name: entry?.name ?? null,
    osiApproved: entry?.osiApproved ?? null,
    category: classifyLicenseCategory(licenseId),
    spdxId: entry ? licenseId : null
  }
}
