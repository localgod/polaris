// See create-license-waiver.cypher for the MERGE-then-attach rationale.
MERGE (vcv:VersionConstraintViolation {naturalKey: $systemName + '|' + $componentPurl + '|' + $constraintName})
  ON CREATE SET
    vcv.systemName = $systemName,
    vcv.componentPurl = $componentPurl,
    vcv.constraintName = $constraintName,
    vcv.status = 'open',
    vcv.firstDetectedAt = datetime(),
    vcv.lastSeenAt = datetime()
CREATE (w:Waiver {
  id: randomUUID(),
  reason: $reason,
  createdBy: $createdBy,
  createdAt: datetime(),
  expiresAt: datetime($expiresAt),
  revokedAt: null,
  revokedBy: null
})
CREATE (w)-[:WAIVES]->(vcv)
RETURN w.id as id, w.reason as reason, w.createdBy as createdBy,
       w.createdAt as createdAt, w.expiresAt as expiresAt
