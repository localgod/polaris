/*
 * Migration: backfill_license_spdx_metadata
 * Version: 20260816.121254
 * Author: @node
 * Ticket: N/A
 *
 * Description:
 * License nodes are created by the SBOM ingest path (persist-component-licenses.cypher),
 * which historically only ever set id/name/url/text/expression — never
 * category, osiApproved, or spdxId, despite the schema, indexes, and API
 * filters assuming those fields are populated. As of this change, ingest
 * also writes them going forward (via server/utils/spdx-license-metadata.ts).
 * This migration backfills the License nodes that already exist, using the
 * same SPDX-registry lookup + category classification, computed offline and
 * embedded here as literals since migrations can't call application code.
 *
 * Only fills currently-null fields (COALESCE-guarded) — never overwrites a
 * value that's already set.
 *
 * Rollback: See 20260816_121254_backfill_license_spdx_metadata.down.cypher
 */

UNWIND [
  { id: '0BSD', name: 'BSD Zero Clause License', category: 'public-domain', osiApproved: true, spdxId: '0BSD' },
  { id: 'Apache-2.0', name: 'Apache License 2.0', category: 'permissive', osiApproved: true, spdxId: 'Apache-2.0' },
  { id: 'BSD-2-Clause', name: 'BSD 2-Clause "Simplified" License', category: 'permissive', osiApproved: true, spdxId: 'BSD-2-Clause' },
  { id: 'BSD-3-Clause', name: 'BSD 3-Clause "New" or "Revised" License', category: 'permissive', osiApproved: true, spdxId: 'BSD-3-Clause' },
  { id: 'BlueOak-1.0.0', name: 'Blue Oak Model License 1.0.0', category: 'permissive', osiApproved: true, spdxId: 'BlueOak-1.0.0' },
  { id: 'CC-BY-3.0', name: 'Creative Commons Attribution 3.0 Unported', category: 'other', osiApproved: false, spdxId: 'CC-BY-3.0' },
  { id: 'CC-BY-4.0', name: 'Creative Commons Attribution 4.0 International', category: 'other', osiApproved: false, spdxId: 'CC-BY-4.0' },
  { id: 'CC0-1.0', name: 'Creative Commons Zero v1.0 Universal', category: 'public-domain', osiApproved: false, spdxId: 'CC0-1.0' },
  { id: 'GPL-2.0', name: 'GNU General Public License v2.0 only', category: 'copyleft', osiApproved: true, spdxId: 'GPL-2.0' },
  { id: 'GPL-2.0-only', name: 'GNU General Public License v2.0 only', category: 'copyleft', osiApproved: true, spdxId: 'GPL-2.0-only' },
  { id: 'GPL-3.0-or-later', name: 'GNU General Public License v3.0 or later', category: 'copyleft', osiApproved: true, spdxId: 'GPL-3.0-or-later' },
  { id: 'ISC', name: 'ISC License', category: 'permissive', osiApproved: true, spdxId: 'ISC' },
  { id: 'LGPL-3.0-or-later', name: 'GNU Lesser General Public License v3.0 or later', category: 'copyleft', osiApproved: true, spdxId: 'LGPL-3.0-or-later' },
  { id: 'MIT', name: 'MIT License', category: 'permissive', osiApproved: true, spdxId: 'MIT' },
  { id: 'MIT-0', name: 'MIT No Attribution', category: 'permissive', osiApproved: true, spdxId: 'MIT-0' },
  { id: 'MPL-2.0', name: 'Mozilla Public License 2.0', category: 'copyleft', osiApproved: true, spdxId: 'MPL-2.0' },
  { id: 'Public Domain', name: null, category: 'public-domain', osiApproved: null, spdxId: null },
  { id: 'Python-2.0', name: 'Python License 2.0', category: 'permissive', osiApproved: true, spdxId: 'Python-2.0' },
  { id: 'Unlicense', name: 'The Unlicense', category: 'public-domain', osiApproved: true, spdxId: 'Unlicense' },
  { id: 'Zlib', name: 'zlib License', category: 'permissive', osiApproved: true, spdxId: 'Zlib' }
] AS row
MATCH (l:License {id: row.id})
SET l.name = COALESCE(l.name, row.name),
    l.category = COALESCE(l.category, row.category),
    l.osiApproved = COALESCE(l.osiApproved, row.osiApproved),
    l.spdxId = COALESCE(l.spdxId, row.spdxId);
