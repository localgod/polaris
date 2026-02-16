/*
 * Migration: decompose_compound_license_expressions
 * Version: 20260216.130000
 *
 * Decompose compound SPDX license expressions into individual license relationships.
 */
// For each compound License node (id contains AND or OR), create HAS_LICENSE
// relationships from its components to the individual licenses, then remove
// the compound node.

// Step 1: Handle expressions containing " AND " or " OR "
// Find compound license nodes and their connected components
MATCH (c:Component)-[oldRel:HAS_LICENSE]->(compound:License)
WHERE compound.id CONTAINS ' AND ' OR compound.id CONTAINS ' OR '

// Extract individual license IDs by splitting on AND/OR and trimming parens
WITH c, compound, oldRel,
     [token IN split(replace(replace(compound.id, '(', ''), ')', ''), ' ')
      WHERE NOT token IN ['AND', 'OR', '']] AS licenseIds

UNWIND licenseIds AS licId

// Create or match individual License nodes
MERGE (l:License {id: licId})
ON CREATE SET
  l.name = licId,
  l.spdxId = licId,
  l.osiApproved = CASE
    WHEN licId IN ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'BSD-2-Clause', 'GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'LGPL-3.0', 'MPL-2.0', 'ISC', 'EPL-1.0', 'EPL-2.0']
    THEN true
    ELSE false
  END,
  l.category = CASE
    WHEN licId IN ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'BSD-2-Clause', 'ISC']
    THEN 'permissive'
    WHEN licId IN ['GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'LGPL-3.0', 'LGPL-3.0-or-later', 'AGPL-3.0', 'MPL-2.0']
    THEN 'copyleft'
    WHEN licId IN ['Unlicense', 'CC0-1.0']
    THEN 'public-domain'
    ELSE 'other'
  END,
  l.deprecated = false,
  l.whitelisted = false,
  l.createdAt = datetime(),
  l.updatedAt = datetime()

// Create relationship with expression metadata
MERGE (c)-[r:HAS_LICENSE]->(l)
ON CREATE SET
  r.createdAt = datetime(),
  r.source = 'SBOM',
  r.expression = compound.id;

// Step 2: Remove the compound license nodes (only those no longer needed)
MATCH (compound:License)
WHERE compound.id CONTAINS ' AND ' OR compound.id CONTAINS ' OR '
DETACH DELETE compound;
