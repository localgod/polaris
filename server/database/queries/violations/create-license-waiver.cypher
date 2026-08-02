// Ensures the target LicenseViolation node exists (MERGE, not MATCH — a
// waiver can be created for a violation the reconciler hasn't swept yet
// since its last 15-minute run) then attaches a new Waiver to it.
MERGE (lv:LicenseViolation {naturalKey: $systemName + '|' + $componentPurl + '|' + $licenseId})
  ON CREATE SET
    lv.systemName = $systemName,
    lv.componentPurl = $componentPurl,
    lv.licenseId = $licenseId,
    lv.status = 'open',
    lv.firstDetectedAt = datetime(),
    lv.lastSeenAt = datetime()
CREATE (w:Waiver {
  id: randomUUID(),
  reason: $reason,
  createdBy: $createdBy,
  createdAt: datetime(),
  expiresAt: datetime($expiresAt),
  revokedAt: null,
  revokedBy: null
})
CREATE (w)-[:WAIVES]->(lv)
RETURN w.id as id, w.reason as reason, w.createdBy as createdBy,
       w.createdAt as createdAt, w.expiresAt as expiresAt
