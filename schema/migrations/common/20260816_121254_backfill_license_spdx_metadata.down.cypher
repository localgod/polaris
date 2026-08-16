/*
 * Rollback Migration: backfill_license_spdx_metadata
 * Version: 20260816.121254
 *
 * This script rolls back the changes made in 20260816_121254_backfill_license_spdx_metadata.up.cypher
 *
 * Note: as with the up migration, this only touches the specific license ids
 * it backfilled. If SBOM ingest ran after the up migration and re-populated
 * these same fields via the normal ingest path, this will remove that data
 * too — same tradeoff already accepted by other data-backfill migrations in
 * this repo (e.g. create_license_entity_and_relationships).
 */

MATCH (l:License)
WHERE l.id IN [
  '0BSD', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'BlueOak-1.0.0',
  'CC-BY-3.0', 'CC-BY-4.0', 'CC0-1.0', 'GPL-2.0', 'GPL-2.0-only',
  'GPL-3.0-or-later', 'ISC', 'LGPL-3.0-or-later', 'MIT', 'MIT-0',
  'MPL-2.0', 'Public Domain', 'Python-2.0', 'Unlicense', 'Zlib'
]
REMOVE l.category, l.osiApproved, l.spdxId;
