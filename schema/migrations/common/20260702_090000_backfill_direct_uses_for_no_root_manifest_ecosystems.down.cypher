// Rollback: Undo direct dependency flags inferred by the no-root-manifest backfill.

MATCH ()-[u:USES {directInferredFrom: 'noRootManifestEcosystem'}]->()
SET u.isDirect = false
REMOVE u.directInferredFrom, u.directInferredAt;
