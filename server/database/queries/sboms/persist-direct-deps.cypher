// Create (System)-[:DIRECT_DEP]->(Component) edges for each component
// that the root component directly depends on.
// $rootBomRef: bomRef of the root component (metadata.component)
// $systemName: name of the system
// $timestamp: ISO timestamp
MATCH (sys:System {name: $systemName})
UNWIND $directBomRefs AS targetRef
MATCH (tgt:Component {bomRef: targetRef})
MERGE (sys)-[r:DIRECT_DEP]->(tgt)
ON CREATE SET r.addedAt = $timestamp
ON MATCH SET r.lastSeenAt = $timestamp
RETURN count(r) AS edgesCreated
