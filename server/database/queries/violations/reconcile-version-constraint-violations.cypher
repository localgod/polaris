// Reconciles the current computed version-constraint-violation set
// ($violations, fed from versionConstraintService.getViolations({ directOnly:
// true }) — the semver-filtered result, NOT the raw repository candidate
// list, since the semver check happens in the service layer) against
// tracked VersionConstraintViolation nodes. See
// reconcile-license-violations.cypher for the pass1/pass2 mechanics.
UNWIND $violations AS v
MERGE (vcv:VersionConstraintViolation {naturalKey: v.systemName + '|' + v.componentPurl + '|' + v.constraintName})
  ON CREATE SET
    vcv.systemName = v.systemName,
    vcv.componentPurl = v.componentPurl,
    vcv.constraintName = v.constraintName,
    vcv.status = 'open',
    vcv.firstDetectedAt = datetime($runStartedAt),
    vcv.lastSeenAt = datetime($runStartedAt)
  ON MATCH SET
    vcv.lastSeenAt = datetime($runStartedAt),
    vcv.resolvedAt = CASE WHEN vcv.status = 'resolved' THEN null ELSE vcv.resolvedAt END,
    vcv.status = CASE WHEN vcv.status = 'resolved' THEN 'open' ELSE vcv.status END
WITH count(vcv) AS touched
CALL {
  MATCH (vcv:VersionConstraintViolation {status: 'open'})
  WHERE vcv.lastSeenAt < datetime($runStartedAt)
  SET vcv.status = 'resolved', vcv.resolvedAt = datetime($runStartedAt)
  RETURN count(vcv) AS resolvedCount
}
RETURN touched, resolvedCount
