// Used by VersionConstraintService.getViolations() to filter/annotate its
// already semver-filtered result set, since version-constraint violations
// are partly computed in JS (not fully determined by Cypher) and so can't
// have the waiver exclusion embedded directly in a single query the way
// license/compliance violations do.
MATCH (v:VersionConstraintViolation)<-[:WAIVES]-(w:Waiver)
WHERE v.naturalKey IN $naturalKeys
  AND w.revokedAt IS NULL
  AND w.expiresAt > datetime()
RETURN v.naturalKey as naturalKey, w.id as waiverId, w.reason as reason, w.expiresAt as expiresAt
