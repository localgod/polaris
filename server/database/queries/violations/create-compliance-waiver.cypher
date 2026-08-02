// See create-license-waiver.cypher for the MERGE-then-attach rationale.
MERGE (cv:ComplianceViolation {naturalKey: $teamName + '|' + $technologyName})
  ON CREATE SET
    cv.teamName = $teamName,
    cv.technologyName = $technologyName,
    cv.status = 'open',
    cv.firstDetectedAt = datetime(),
    cv.lastSeenAt = datetime()
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
