// Create DEPENDS_ON edges between Component nodes based on SBOM dependency data.
// Components are matched by bomRef. Unresolvable refs are silently skipped.
//
// $dependencies is pre-flattened to { ref, targetRef } pairs by the repository
// so this query uses a single UNWIND, keeping the working set at most BATCH_SIZE
// rows rather than multiplying it by the average dependsOn list length.
UNWIND $dependencies AS dep
MATCH (src:Component {bomRef: dep.ref})
MATCH (tgt:Component {bomRef: dep.targetRef})
MERGE (src)-[r:DEPENDS_ON]->(tgt)
ON CREATE SET r.addedAt = $timestamp
ON MATCH SET r.lastSeenAt = $timestamp
RETURN count(r) AS edgesCreated
