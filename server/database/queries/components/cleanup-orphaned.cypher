// Delete Component nodes that are no longer used by any system and have not been
// claimed by a Technology. These accumulate because SBOM imports only MERGE edges
// and never remove stale USES relationships from previous scans.
//
// Safety guards:
//   - EXISTS { ()-[:USES]->(c) }      → skip components still used by any system
//   - EXISTS { (c)-[:IS_VERSION_OF]-> } → skip components claimed by a Technology
//
// DETACH DELETE removes the node and all its relationships (DEPENDS_ON edges,
// HAS_HASH, HAS_LICENSE, HAS_EXTERNAL_REF) in one operation.
MATCH (c:Component)
WHERE NOT EXISTS { MATCH ()-[:USES]->(c) }
  AND NOT EXISTS { MATCH (c)-[:IS_VERSION_OF]->() }
WITH c
LIMIT toInteger($batchSize)
DETACH DELETE c
RETURN count(c) AS deletedCount
