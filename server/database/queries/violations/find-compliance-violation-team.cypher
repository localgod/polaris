// Resolves the owning team for a compliance waiver request from the
// persisted ComplianceViolation node rather than trusting the caller's
// teamName directly — returns nothing if no such violation has been
// detected yet, so the API can 404 instead of authorizing a phantom
// violation (issue #880).
MATCH (cv:ComplianceViolation {naturalKey: $teamName + '|' + $technologyName})
RETURN cv.teamName as teamName
