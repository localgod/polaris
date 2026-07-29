MATCH (t:Technology {name: $name})
// Pin a single, deterministic steward team (alphabetically first) before
// the other OPTIONAL MATCHes so a Technology with more than one steward
// doesn't multiply into duplicate rows below (stewardTeamName/stewardTeamEmail
// are single fields, not lists). The ORDER BY before collect() is required
// -- Cypher's collect() has no guaranteed order otherwise, so picking [0]
// without it can return a different team on every execution.
OPTIONAL MATCH (stewardTeam:Team)-[:STEWARDED_BY]->(t)
WITH t, stewardTeam
ORDER BY stewardTeam.name
WITH t, collect(stewardTeam)[0] as team

// Isolated in its own subquery, before the OPTIONAL MATCHes below, so the
// per-component isDirect aggregate (isDirect is true if ANY system uses that
// exact component version directly, regardless of how many other systems only
// depend on it transitively) is computed once per technology rather than once
// per cross-multiplied row. Also carries the list of systems using this exact
// component/version (a Component node IS one specific version, so counting
// components-per-version is nearly always 1 — the number of systems using
// that version is the metric that actually varies). The technology-wide
// `systems` list (every system using ANY version, direct or not) is derived
// from this same data in the repository layer rather than queried again here.
CALL {
  WITH t
  OPTIONAL MATCH (c:Component)-[:IS_VERSION_OF]->(t)
  OPTIONAL MATCH (sys:System)-[u:USES]->(c)
  WITH c, sys, max(CASE WHEN u.isDirect = true THEN 1 ELSE 0 END) as sysMaxDirect
  WITH c, [s IN collect(CASE WHEN sys IS NOT NULL THEN {name: sys.name, isDirect: sysMaxDirect = 1} END) WHERE s IS NOT NULL] as componentSystems
  WHERE c IS NOT NULL
  RETURN collect({
    name: c.name,
    version: c.version,
    packageManager: c.packageManager,
    isDirect: any(s IN componentSystems WHERE s.isDirect),
    systems: componentSystems
  }) as components
}

OPTIONAL MATCH (vc:VersionConstraint)-[:GOVERNS]->(t)
OPTIONAL MATCH (approvalTeam:Team)-[techApproval:APPROVES]->(t)
OPTIONAL MATCH (approvedByUser:User {id: techApproval.approvedBy})
RETURN t.name as name,
       t.type as type,
       t.domain as domain,
       t.vendor as vendor,
       t.lastReviewed as lastReviewed,
       team.name as stewardTeamName,
       team.email as stewardTeamEmail,
       [] as versions,
       components,
       collect(DISTINCT {
         name: vc.name,
         severity: vc.severity,
         versionRange: vc.versionRange,
         status: vc.status
       }) as constraints,
       collect(DISTINCT {
         team: approvalTeam.name,
         time: techApproval.time,
         environment: techApproval.environment,
         approvedAt: techApproval.approvedAt,
         deprecatedAt: techApproval.deprecatedAt,
         eolDate: techApproval.eolDate,
         migrationTarget: techApproval.migrationTarget,
         notes: techApproval.notes,
         approvedBy: techApproval.approvedBy,
         approvedByName: approvedByUser.name
       }) as technologyApprovals,
       [] as versionApprovals
