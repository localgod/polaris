// Find the system
MATCH (s:System {name: $systemName})

// Process each component
UNWIND $components AS comp

// Create unique identifier for purl (prefer purl, fallback to name@version)
WITH s, comp,
     COALESCE(comp.purl, comp.name + '@' + COALESCE(comp.version, 'unknown')) AS componentPurl

// Check if component exists before MERGE (using the constraint fields)
OPTIONAL MATCH (existing:Component {name: comp.name, version: COALESCE(comp.version, 'unknown'), packageManager: COALESCE(comp.packageManager, 'unknown')})
WITH s, comp, componentPurl, existing IS NOT NULL AS componentExists

// MERGE component by the unique constraint fields (name, version, packageManager)
// This avoids constraint violations when different PURLs map to the same component
MERGE (c:Component {name: comp.name, version: COALESCE(comp.version, 'unknown'), packageManager: COALESCE(comp.packageManager, 'unknown')})
ON CREATE SET
  c.purl = componentPurl,
  c.createdAt = $timestamp
ON MATCH SET
  c.updatedAt = $timestamp

// Set optional properties only if they exist in comp
WITH s, c, comp, componentExists
FOREACH (_ IN CASE WHEN comp.cpe IS NOT NULL THEN [1] ELSE [] END |
  SET c.cpe = comp.cpe
)
FOREACH (_ IN CASE WHEN comp.bomRef IS NOT NULL THEN [1] ELSE [] END |
  SET c.bomRef = comp.bomRef
)
FOREACH (_ IN CASE WHEN comp.type IS NOT NULL THEN [1] ELSE [] END |
  SET c.type = comp.type
)
FOREACH (_ IN CASE WHEN comp.group IS NOT NULL THEN [1] ELSE [] END |
  SET c.group = comp.group
)
FOREACH (_ IN CASE WHEN comp.scope IS NOT NULL THEN [1] ELSE [] END |
  SET c.scope = comp.scope
)
FOREACH (_ IN CASE WHEN comp.copyright IS NOT NULL THEN [1] ELSE [] END |
  SET c.copyright = comp.copyright
)
FOREACH (_ IN CASE WHEN comp.supplier IS NOT NULL THEN [1] ELSE [] END |
  SET c.supplier = comp.supplier
)
FOREACH (_ IN CASE WHEN comp.author IS NOT NULL THEN [1] ELSE [] END |
  SET c.author = comp.author
)
FOREACH (_ IN CASE WHEN comp.publisher IS NOT NULL THEN [1] ELSE [] END |
  SET c.publisher = comp.publisher
)
FOREACH (_ IN CASE WHEN comp.homepage IS NOT NULL THEN [1] ELSE [] END |
  SET c.homepage = comp.homepage
)
FOREACH (_ IN CASE WHEN comp.description IS NOT NULL THEN [1] ELSE [] END |
  SET c.description = comp.description
)

// Check if relationship exists before MERGE
WITH s, c, comp, componentExists
OPTIONAL MATCH (s)-[existingRel:USES]->(c)
WITH s, c, comp, componentExists, existingRel IS NOT NULL AS relationshipExists

// Create System-Component relationship
MERGE (s)-[r:USES]->(c)
ON CREATE SET r.addedAt = $timestamp
ON MATCH SET r.lastSeenAt = $timestamp

// Store component index for later use
WITH s, c, comp.index AS compIndex, componentExists, relationshipExists

// Delete existing hashes and licenses to replace with new ones
OPTIONAL MATCH (c)-[oldHashRel:HAS_HASH]->(oldHash:Hash)
DELETE oldHashRel, oldHash

WITH s, c, compIndex, componentExists, relationshipExists

OPTIONAL MATCH (c)-[oldLicRel:HAS_LICENSE]->(oldLic:License)
WHERE NOT EXISTS {
  MATCH (c2:Component)-[:HAS_LICENSE]->(oldLic)
  WHERE c2 <> c
}
DELETE oldLicRel, oldLic

WITH s, c, compIndex, componentExists, relationshipExists

OPTIONAL MATCH (c)-[oldRefRel:HAS_REFERENCE]->(oldRef:ExternalReference)
WHERE NOT EXISTS {
  MATCH (c2:Component)-[:HAS_REFERENCE]->(oldRef)
  WHERE c2 <> c
}
DELETE oldRefRel, oldRef

// Create Hash nodes for this component
WITH s, c, compIndex, componentExists, relationshipExists, $hashes AS allHashes
FOREACH (hash IN [h IN allHashes WHERE h.componentIndex = compIndex AND h.algorithm IS NOT NULL AND h.value IS NOT NULL] |
  CREATE (hashNode:Hash {
    algorithm: hash.algorithm,
    value: hash.value
  })
  CREATE (c)-[:HAS_HASH]->(hashNode)
)

// Create License nodes for this component
WITH s, c, compIndex, componentExists, relationshipExists, $licenses AS allLicenses, $timestamp AS timestamp
FOREACH (license IN [lic IN allLicenses WHERE lic.componentIndex = compIndex AND (lic.id IS NOT NULL OR lic.name IS NOT NULL)] |
  MERGE (l:License {id: COALESCE(license.id, license.name)})
  ON CREATE SET 
    l.name = COALESCE(license.name, license.id),
    l.spdxId = COALESCE(license.id, license.name),
    l.url = license.url,
    l.text = license.text,
    l.osiApproved = CASE 
      WHEN COALESCE(license.id, license.name) IN ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'BSD-2-Clause', 'GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'LGPL-3.0', 'MPL-2.0', 'ISC', 'EPL-1.0', 'EPL-2.0']
      THEN true
      ELSE false
    END,
    l.category = CASE
      WHEN COALESCE(license.id, license.name) IN ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'BSD-2-Clause', 'ISC']
      THEN 'permissive'
      WHEN COALESCE(license.id, license.name) IN ['GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'LGPL-3.0', 'AGPL-3.0', 'MPL-2.0']
      THEN 'copyleft'
      WHEN COALESCE(license.id, license.name) IN ['Unlicense', 'CC0-1.0']
      THEN 'public-domain'
      WHEN COALESCE(license.id, license.name) CONTAINS 'Proprietary' OR COALESCE(license.id, license.name) CONTAINS 'Commercial'
      THEN 'proprietary'
      ELSE 'other'
    END,
    l.deprecated = false,
    l.createdAt = timestamp,
    l.updatedAt = timestamp
  ON MATCH SET
    l.updatedAt = timestamp,
    l.url = COALESCE(l.url, license.url),
    l.text = COALESCE(l.text, license.text)
  MERGE (c)-[r:HAS_LICENSE]->(l)
  ON CREATE SET r.createdAt = timestamp, r.source = 'SBOM'
)

// Create ExternalReference nodes for this component
WITH s, c, compIndex, componentExists, relationshipExists, $externalReferences AS allRefs
FOREACH (ref IN [r IN allRefs WHERE r.componentIndex = compIndex AND r.type IS NOT NULL AND r.url IS NOT NULL] |
  CREATE (er:ExternalReference {
    type: ref.type,
    url: ref.url
  })
  CREATE (c)-[:HAS_REFERENCE]->(er)
)

// Aggregate statistics
WITH CASE WHEN componentExists THEN 0 ELSE 1 END AS added,
     CASE WHEN componentExists THEN 1 ELSE 0 END AS updated,
     CASE WHEN relationshipExists THEN 0 ELSE 1 END AS relCreated

RETURN sum(added) AS componentsAdded,
       sum(updated) AS componentsUpdated,
       sum(relCreated) AS relationshipsCreated
