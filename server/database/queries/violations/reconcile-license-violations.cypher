// Reconciles the current computed license-violation set ($violations, fed
// from LicenseRepository.findViolations({ directOnly: true }) — the same
// query the live GET /api/licenses/violations endpoint uses) against
// tracked LicenseViolation nodes. Pass 1 upserts (touches) every currently
// computed violation; pass 2 resolves anything not touched this run.
// $runStartedAt is a single timestamp captured once in JS before this
// query runs, so "touched this run" vs "stale" is an exact comparison
// rather than being sensitive to per-statement clock skew.
UNWIND $violations AS v
MERGE (lv:LicenseViolation {naturalKey: v.systemName + '|' + v.componentPurl + '|' + v.licenseId})
  ON CREATE SET
    lv.systemName = v.systemName,
    lv.componentPurl = v.componentPurl,
    lv.licenseId = v.licenseId,
    lv.status = 'open',
    lv.firstDetectedAt = datetime($runStartedAt),
    lv.lastSeenAt = datetime($runStartedAt)
  ON MATCH SET
    lv.lastSeenAt = datetime($runStartedAt),
    lv.resolvedAt = CASE WHEN lv.status = 'resolved' THEN null ELSE lv.resolvedAt END,
    lv.status = CASE WHEN lv.status = 'resolved' THEN 'open' ELSE lv.status END
WITH count(lv) AS touched
CALL {
  MATCH (lv:LicenseViolation {status: 'open'})
  WHERE lv.lastSeenAt < datetime($runStartedAt)
  SET lv.status = 'resolved', lv.resolvedAt = datetime($runStartedAt)
  RETURN count(lv) AS resolvedCount
}
RETURN touched, resolvedCount
