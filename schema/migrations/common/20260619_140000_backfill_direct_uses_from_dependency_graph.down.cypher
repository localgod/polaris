// Rollback: Undo direct dependency flags inferred by the graph backfill.

MATCH ()-[u:USES {directInferredFrom: 'dependencyGraph'}]->()
SET u.isDirect = false
REMOVE u.directInferredFrom, u.directInferredAt;
