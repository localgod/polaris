// Reconciles the current computed compliance-violation set ($violations,
// fed from ComplianceRepository.findViolations({ directOnly: true })) against
// tracked ComplianceViolation nodes. See reconcile-license-violations.cypher
// for the pass1/pass2 mechanics.
UNWIND $violations AS v
MERGE (cv:ComplianceViolation {naturalKey: v.teamName + '|' + v.technologyName})
  ON CREATE SET
    cv.teamName = v.teamName,
    cv.technologyName = v.technologyName,
    cv.status = 'open',
    cv.firstDetectedAt = datetime($runStartedAt),
    cv.lastSeenAt = datetime($runStartedAt)
  ON MATCH SET
    cv.lastSeenAt = datetime($runStartedAt),
    cv.resolvedAt = CASE WHEN cv.status = 'resolved' THEN null ELSE cv.resolvedAt END,
    cv.status = CASE WHEN cv.status = 'resolved' THEN 'open' ELSE cv.status END
WITH count(cv) AS touched
CALL {
  MATCH (cv:ComplianceViolation {status: 'open'})
  WHERE cv.lastSeenAt < datetime($runStartedAt)
  SET cv.status = 'resolved', cv.resolvedAt = datetime($runStartedAt)
  RETURN count(cv) AS resolvedCount
}
RETURN touched, resolvedCount
