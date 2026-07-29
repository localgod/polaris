// Delete HealthSnapshot nodes with no relationships at all. Unlike
// Hash/ExternalReference, a HealthSnapshot is 1:1 with one Component (keyed
// on componentPurl) and is never shared — it becomes orphaned only when its
// owning Component is deleted (cleanup-orphaned.cypher), since DETACH DELETE
// on the Component removes the HAS_HEALTH_SNAPSHOT edge but not the
// HealthSnapshot node on the other end.
MATCH (n:HealthSnapshot)
WHERE NOT (n)--()
WITH n
LIMIT toInteger($batchSize)
DETACH DELETE n
RETURN count(n) AS deletedCount
