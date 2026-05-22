// Replace HAS_HASH relationships for a batch of components.
// Runs as a dedicated transaction to avoid chaining eager barriers with
// license and external-reference writes.
//
// Only relationships are deleted — Hash nodes are shared across components
// and are left intact to avoid corrupting other components.
UNWIND $components AS comp
MATCH (c:Component {purl: COALESCE(comp.purl, comp.name + '@' + COALESCE(comp.version, 'unknown'))})

OPTIONAL MATCH (c)-[oldHashRel:HAS_HASH]->(:Hash)
DELETE oldHashRel

WITH c, comp
FOREACH (hash IN comp.hashes |
  MERGE (h:Hash {algorithm: hash.algorithm, value: hash.value})
  MERGE (c)-[:HAS_HASH]->(h)
)

RETURN count(c) AS componentsProcessed
