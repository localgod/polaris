// Create (System)-[:DIRECT_DEP]->(Component) edges for each component
// that the root component directly depends on.
// $systemName: name of the system
// $timestamp: ISO timestamp
// $directDeps: array of { bomRef: string, scope: string | null }
MATCH (sys:System {name: $systemName})
UNWIND $directDeps AS dep
MATCH (tgt:Component {bomRef: dep.bomRef})
MERGE (sys)-[r:DIRECT_DEP]->(tgt)
ON CREATE SET r.addedAt = $timestamp, r.scope = dep.scope
ON MATCH SET r.lastSeenAt = $timestamp, r.scope = dep.scope
RETURN count(r) AS edgesCreated
