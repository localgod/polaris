// Delete Hash nodes with no relationships at all. Hash nodes are shared
// across components by design (see sboms/persist-component-hashes.cypher,
// which MERGEs onto an existing Hash rather than always creating a new
// one), so a Hash only becomes safe to delete once every Component that
// referenced it has either been deleted (cleanup-orphaned.cypher) or had
// its HAS_HASH edge replaced by a re-scan pointing at a different Hash.
MATCH (n:Hash)
WHERE NOT (n)--()
WITH n
LIMIT toInteger($batchSize)
DETACH DELETE n
RETURN count(n) AS deletedCount
