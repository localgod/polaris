// Resolves the owning team and current revoked state for a waiver, so the
// DELETE endpoint can authorize the request before revoking. Handles all
// three violation-node labels generically via label-check CASE branches
// rather than requiring the caller to already know the violation type.
MATCH (w:Waiver {id: $id})-[:WAIVES]->(v)
RETURN
  w.id as id,
  w.revokedAt as revokedAt,
  labels(v)[0] as violationType,
  CASE
    WHEN v:ComplianceViolation THEN v.teamName
    ELSE [(t:Team)-[:OWNS]->(:System {name: v.systemName}) | t.name][0]
  END as teamName
