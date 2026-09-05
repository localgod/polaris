// Unlike license/version-constraint violations (keyed by an owned System —
// see create-license-waiver.cypher for that MERGE-then-attach rationale),
// a compliance violation's naturalKey embeds the caller-supplied teamName
// directly with no independent graph anchor. MERGE-creating it here would
// let any team member fabricate a violation for any team+technology pair
// and pre-attach a waiver before one is real (issue #880). The violation
// must already exist — created by the compliance reconcile job from actual
// detected violations — so this MATCHes rather than MERGEs.
MATCH (cv:ComplianceViolation {naturalKey: $teamName + '|' + $technologyName})
CREATE (w:Waiver {
  id: randomUUID(),
  reason: $reason,
  createdBy: $createdBy,
  createdAt: datetime(),
  expiresAt: datetime($expiresAt),
  revokedAt: null,
  revokedBy: null
})
CREATE (w)-[:WAIVES]->(cv)
RETURN w.id as id, w.reason as reason, w.createdBy as createdBy,
       w.createdAt as createdAt, w.expiresAt as expiresAt
