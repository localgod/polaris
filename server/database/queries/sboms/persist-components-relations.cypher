// Phase 2: Replace hashes, licenses, and external references for a batch of
// components. Runs after persist-components-core.cypher with a smaller batch
// size (RELATIONS_BATCH_SIZE) to keep each transaction within memory limits.
//
// Hash and ExternalReference nodes are shared across components (MERGEd on
// their content). Only the relationships are deleted and re-created — the
// nodes themselves are left intact to avoid corrupting other components.
UNWIND $components AS comp
MATCH (c:Component {purl: COALESCE(comp.purl, comp.name + '@' + COALESCE(comp.version, 'unknown'))})

// Replace hashes — delete only the relationships, not the shared Hash nodes
OPTIONAL MATCH (c)-[oldHashRel:HAS_HASH]->(:Hash)
DELETE oldHashRel

WITH c, comp
FOREACH (hash IN comp.hashes |
  MERGE (h:Hash {algorithm: hash.algorithm, value: hash.value})
  MERGE (c)-[:HAS_HASH]->(h)
)

// Replace licenses — delete only the relationships, not the shared License nodes
WITH c, comp
OPTIONAL MATCH (c)-[oldLicRel:HAS_LICENSE]->(:License)
DELETE oldLicRel

WITH c, comp
FOREACH (lic IN comp.licenses |
  MERGE (l:License {id: COALESCE(lic.id, lic.name)})
  ON CREATE SET l.name = lic.name, l.url = lic.url, l.text = lic.text, l.expression = lic.expression
  ON MATCH SET l.name = COALESCE(lic.name, l.name), l.url = COALESCE(lic.url, l.url)
  FOREACH (_ IN CASE WHEN lic.allowed IS NOT NULL THEN [1] ELSE [] END | SET l.allowed = lic.allowed)
  MERGE (c)-[:HAS_LICENSE]->(l)
)

// Replace external references — delete only the relationships, not the shared ExternalReference nodes
WITH c, comp
OPTIONAL MATCH (c)-[oldRefRel:HAS_EXTERNAL_REF]->(:ExternalReference)
DELETE oldRefRel

WITH c, comp
FOREACH (ref IN comp.externalReferences |
  MERGE (er:ExternalReference {type: ref.type, url: ref.url})
  MERGE (c)-[:HAS_EXTERNAL_REF]->(er)
)

RETURN count(c) AS componentsProcessed
