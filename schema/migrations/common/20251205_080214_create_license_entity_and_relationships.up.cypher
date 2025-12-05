/*
 * Migration: create_license_entity_and_relationships
 * Version: 20251205.080214
 * Author: @vscode
 * Ticket: #103
 * 
 * Description:
 * Creates License entity nodes and converts existing Component.licenses arrays
 * to proper License nodes with HAS_LICENSE relationships. This enables:
 * - Reusable License entities across components
 * - License-based policy enforcement
 * - Better license compliance reporting
 * - Reduced data duplication
 *
 * Migration Strategy:
 * 1. Create License constraint and indexes
 * 2. Extract unique licenses from all components
 * 3. Create License nodes with MERGE (idempotent)
 * 4. Create HAS_LICENSE relationships
 * 5. Preserve original license data in Component for rollback safety
 *
 * Dependencies:
 * - Requires Component nodes with licenses property
 *
 * Rollback: See 20251205_080214_create_license_entity_and_relationships.down.cypher
 */

// Step 1: Create License constraint
CREATE CONSTRAINT license_id_unique IF NOT EXISTS
FOR (l:License)
REQUIRE l.id IS UNIQUE;

// Step 2: Create License indexes for performance
CREATE INDEX license_spdx_id IF NOT EXISTS
FOR (l:License)
ON (l.spdxId);

CREATE INDEX license_category IF NOT EXISTS
FOR (l:License)
ON (l.category);

CREATE INDEX license_osi_approved IF NOT EXISTS
FOR (l:License)
ON (l.osiApproved);

// Step 3: Extract and create License nodes from existing Component.licenses
// This handles all license formats: SPDX IDs, names, and full license objects
MATCH (c:Component)
WHERE c.licenses IS NOT NULL AND size(c.licenses) > 0
UNWIND c.licenses AS licenseData
WITH DISTINCT
  CASE 
    WHEN licenseData.id IS NOT NULL THEN licenseData.id
    WHEN licenseData.name IS NOT NULL THEN licenseData.name
    ELSE 'UNKNOWN'
  END AS licenseId,
  licenseData
WHERE licenseId <> 'UNKNOWN'
MERGE (l:License {id: licenseId})
ON CREATE SET
  l.name = COALESCE(licenseData.name, licenseId),
  l.spdxId = COALESCE(licenseData.id, licenseId),
  l.url = licenseData.url,
  l.text = licenseData.text,
  l.osiApproved = CASE 
    WHEN licenseId IN ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'BSD-2-Clause', 'GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'LGPL-3.0', 'MPL-2.0', 'ISC', 'EPL-1.0', 'EPL-2.0']
    THEN true
    ELSE false
  END,
  l.category = CASE
    WHEN licenseId IN ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'BSD-2-Clause', 'ISC']
    THEN 'permissive'
    WHEN licenseId IN ['GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'LGPL-3.0', 'AGPL-3.0', 'MPL-2.0']
    THEN 'copyleft'
    WHEN licenseId IN ['Unlicense', 'CC0-1.0']
    THEN 'public-domain'
    WHEN licenseId CONTAINS 'Proprietary' OR licenseId CONTAINS 'Commercial'
    THEN 'proprietary'
    ELSE 'other'
  END,
  l.deprecated = false,
  l.createdAt = datetime(),
  l.updatedAt = datetime()
ON MATCH SET
  l.updatedAt = datetime(),
  l.url = COALESCE(l.url, licenseData.url),
  l.text = COALESCE(l.text, licenseData.text);

// Step 4: Create HAS_LICENSE relationships between Components and Licenses
MATCH (c:Component)
WHERE c.licenses IS NOT NULL AND size(c.licenses) > 0
UNWIND c.licenses AS licenseData
WITH c, licenseData,
  CASE 
    WHEN licenseData.id IS NOT NULL THEN licenseData.id
    WHEN licenseData.name IS NOT NULL THEN licenseData.name
    ELSE 'UNKNOWN'
  END AS licenseId
WHERE licenseId <> 'UNKNOWN'
MATCH (l:License {id: licenseId})
MERGE (c)-[r:HAS_LICENSE]->(l)
ON CREATE SET
  r.createdAt = datetime(),
  r.source = 'MIGRATION';

// Step 5: Add metadata to track migration
// Keep original licenses array for rollback safety (will be removed in future migration)
MATCH (c:Component)
WHERE c.licenses IS NOT NULL
SET c._licenses_migrated = true,
    c._licenses_migration_date = datetime();
