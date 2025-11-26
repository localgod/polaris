// Find the system
MATCH (s:System {name: $systemName})

// Process each component
UNWIND $components AS comp

// Create unique identifier (prefer purl, fallback to name@version)
WITH s, comp,
     COALESCE(comp.purl, comp.name + '@' + COALESCE(comp.version, 'unknown')) AS componentId

// Check if component exists before MERGE
OPTIONAL MATCH (existing:Component {purl: componentId})
WITH s, comp, componentId, existing IS NOT NULL AS componentExists

// MERGE component by unique identifier
MERGE (c:Component {purl: componentId})
ON CREATE SET
  c.name = comp.name,
  c.createdAt = $timestamp
ON MATCH SET
  c.updatedAt = $timestamp

// Set optional properties only if they exist in comp
WITH s, c, comp, componentExists
FOREACH (_ IN CASE WHEN comp.version IS NOT NULL THEN [1] ELSE [] END |
  SET c.version = comp.version
)
FOREACH (_ IN CASE WHEN comp.packageManager IS NOT NULL THEN [1] ELSE [] END |
  SET c.packageManager = comp.packageManager
)
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

// Track statistics
WITH s, c, comp, componentExists, relationshipExists

// Delete existing hashes and licenses to replace with new ones
OPTIONAL MATCH (c)-[oldHashRel:HAS_HASH]->(oldHash:Hash)
DELETE oldHashRel, oldHash

WITH s, c, comp, componentExists, relationshipExists

OPTIONAL MATCH (c)-[oldLicRel:HAS_LICENSE]->(oldLic:License)
WHERE NOT EXISTS {
  MATCH (c2:Component)-[:HAS_LICENSE]->(oldLic)
  WHERE c2 <> c
}
DELETE oldLicRel, oldLic

WITH s, c, comp, componentExists, relationshipExists

OPTIONAL MATCH (c)-[oldRefRel:HAS_REFERENCE]->(oldRef:ExternalReference)
WHERE NOT EXISTS {
  MATCH (c2:Component)-[:HAS_REFERENCE]->(oldRef)
  WHERE c2 <> c
}
DELETE oldRefRel, oldRef

// Create Hash nodes (only if hash has required fields)
WITH s, c, comp, componentExists, relationshipExists
FOREACH (hash IN [h IN comp.hashes WHERE h.algorithm IS NOT NULL AND h.value IS NOT NULL] |
  CREATE (hashNode:Hash {
    algorithm: hash.algorithm,
    value: hash.value
  })
  CREATE (c)-[:HAS_HASH]->(hashNode)
)

// Create License nodes (only if license has id)
WITH s, c, comp, componentExists, relationshipExists
FOREACH (license IN [lic IN comp.licenses WHERE lic.id IS NOT NULL] |
  MERGE (l:License {id: license.id})
  ON CREATE SET 
    l.name = CASE WHEN license.name IS NOT NULL THEN license.name ELSE null END,
    l.url = CASE WHEN license.url IS NOT NULL THEN license.url ELSE null END,
    l.text = CASE WHEN license.text IS NOT NULL THEN license.text ELSE null END
  MERGE (c)-[:HAS_LICENSE]->(l)
)

// Create ExternalReference nodes (only if ref has required fields)
WITH s, c, comp, componentExists, relationshipExists
FOREACH (ref IN [r IN comp.externalReferences WHERE r.type IS NOT NULL AND r.url IS NOT NULL] |
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
