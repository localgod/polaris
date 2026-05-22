// Rollback: Restore scope on Component nodes from USES edges
//
// This is a best-effort rollback. Because multiple systems may use the same
// Component with different scopes, only one scope value can be stored on the
// node. The rollback picks an arbitrary value per component (last SET wins).
// Data fidelity is not guaranteed after rollback.

MATCH (s:System)-[r:USES]->(c:Component)
WHERE r.scope IS NOT NULL
SET c.scope = r.scope;
