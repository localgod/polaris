// Rollback: Restore DIRECT_DEP edges from USES {isDirect: true} and drop indexes
//
// This is a best-effort rollback. scope on the restored DIRECT_DEP edges is
// copied from the USES edge; it may differ from the original if re-ingestion
// has occurred since the up migration ran.

// Step 1: Drop the relationship indexes added by the up migration.
DROP INDEX uses_scope IF EXISTS;
DROP INDEX uses_is_direct IF EXISTS;

// Step 2: Recreate DIRECT_DEP edges from USES edges where isDirect=true.
MATCH (s:System)-[u:USES {isDirect: true}]->(c:Component)
MERGE (s)-[r:DIRECT_DEP]->(c)
ON CREATE SET r.addedAt = u.addedAt, r.scope = u.scope;

// Step 3: Remove isDirect from all USES edges.
MATCH ()-[r:USES]->()
REMOVE r.isDirect;
