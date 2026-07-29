// Delete ExternalReference nodes with no relationships at all — same
// rationale as cleanup-orphaned-hashes.cypher, but for the nodes
// sboms/persist-component-extrefs.cypher shares across components.
MATCH (n:ExternalReference)
WHERE NOT (n)--()
WITH n
LIMIT toInteger($batchSize)
DETACH DELETE n
RETURN count(n) AS deletedCount
