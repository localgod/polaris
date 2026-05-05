// Create DEPENDS_ON edges between Component nodes based on SBOM dependency data.
// Components are matched by bomRef. Unresolvable refs are silently skipped.
UNWIND $dependencies AS dep
MATCH (src:Component {bomRef: dep.ref})
UNWIND dep.dependsOn AS targetRef
MATCH (tgt:Component {bomRef: targetRef})
MERGE (src)-[r:DEPENDS_ON]->(tgt)
ON CREATE SET r.addedAt = $timestamp
ON MATCH SET r.lastSeenAt = $timestamp
RETURN count(r) AS edgesCreated
