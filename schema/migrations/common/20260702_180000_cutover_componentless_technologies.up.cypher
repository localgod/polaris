// Migration: Cutover for componentless Technologies
//
// Technology now requires >=1 linked Component (see docs/architecture/
// decisions/0004-technology-requires-component.md). Run only after the
// Platform node (schema/migrations/common/20260702_150000_create_platform_node)
// and the locked-down creation path are deployed, so nothing can recreate a
// componentless Technology while this runs.
//
// For every existing Technology with no linked Component:
//   - infra-flavored ones (type/domain suggesting non-SBOM-observable
//     infrastructure -- the exact pattern SBOM scanning can never surface,
//     e.g. databases, container runtimes) convert to Platform, preserving
//     name/type/domain/vendor, stewardship (OWNS -> STEWARDED_BY), and TIME
//     approvals.
//   - everything else is deleted. An AuditLog captures the full node
//     properties before removal for traceability -- deletion is not
//     reversible; see .down.cypher.
//
// Before running against real data: dry-run
//   MATCH (t:Technology) WHERE NOT (:Component)-[:IS_VERSION_OF]->(t)
//   RETURN t.name, t.type, t.domain
// via the Neo4j MCP to review the convert-vs-delete split first.

// Pass 1: convert infra-flavored componentless technologies to Platform
MATCH (t:Technology)
WHERE NOT (:Component)-[:IS_VERSION_OF]->(t)
  AND (t.type IN ['platform', 'operating-system', 'device', 'firmware', 'container']
       OR t.domain IN ['infrastructure', 'data-platform', 'integration-platform'])
CREATE (p:Platform {
  name: t.name,
  type: t.type,
  domain: t.domain,
  vendor: t.vendor
})
WITH t, p
OPTIONAL MATCH (stewardTeam:Team)-[:OWNS]->(t)
FOREACH (_ IN CASE WHEN stewardTeam IS NOT NULL THEN [1] ELSE [] END |
  CREATE (stewardTeam)-[:STEWARDED_BY]->(p)
)
WITH t, p
OPTIONAL MATCH (approvalTeam:Team)-[a:APPROVES]->(t)
FOREACH (_ IN CASE WHEN approvalTeam IS NOT NULL THEN [1] ELSE [] END |
  CREATE (approvalTeam)-[:APPROVES {
    environment: a.environment,
    time: a.time,
    approvedAt: a.approvedAt,
    approvedBy: a.approvedBy,
    notes: a.notes
  }]->(p)
)
WITH DISTINCT t, p
CREATE (al:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'CONVERT',
  entityType: 'Technology',
  entityId: t.name,
  entityLabel: t.name + ' -> Platform (componentless cutover)',
  changedFields: [],
  changes: apoc.convert.toJson({technology: properties(t), convertedTo: 'Platform'}),
  source: 'MIGRATION',
  userId: 'system',
  realUserId: null
})
CREATE (al)-[:AUDITS]->(p)
DETACH DELETE t;

// Pass 2: delete everything else still componentless (non-infra-flavored)
MATCH (t:Technology)
WHERE NOT (:Component)-[:IS_VERSION_OF]->(t)
CREATE (al:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'DELETE',
  entityType: 'Technology',
  entityId: t.name,
  entityLabel: t.name + ' (componentless cutover)',
  changedFields: [],
  changes: apoc.convert.toJson({technology: properties(t)}),
  source: 'MIGRATION',
  userId: 'system',
  realUserId: null
})
DETACH DELETE t;
