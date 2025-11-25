/*
 * Migration: Add AUDITS Relationships to AuditLog
 * Version: 2025.11.25.080612
 * Author: @ona
 * 
 * Description:
 * Creates AUDITS relationships from AuditLog to audited entities:
 * - Technology (governance decisions)
 * - Team (membership, ownership changes)
 * - Policy (governance rules)
 * - System (ownership, criticality changes)
 * - Version (approval decisions)
 *
 * This enables graph queries to find audit history for specific entities
 * and provides proper graph-based audit trail functionality.
 *
 * The relationships are created based on the existing entityType and entityId
 * properties in AuditLog nodes.
 *
 * Dependencies:
 * - AuditLog nodes must have entityType and entityId properties
 * - Target entity nodes must exist
 *
 * Rollback: See corresponding .down.cypher file
 */

// Create AUDITS relationships for Technology entities
MATCH (a:AuditLog)
WHERE a.entityType = 'Technology' AND a.entityId IS NOT NULL
MATCH (t:Technology {name: a.entityId})
MERGE (a)-[:AUDITS]->(t);

// Create AUDITS relationships for Team entities
MATCH (a:AuditLog)
WHERE a.entityType = 'Team' AND a.entityId IS NOT NULL
MATCH (t:Team {name: a.entityId})
MERGE (a)-[:AUDITS]->(t);

// Create AUDITS relationships for Policy entities
MATCH (a:AuditLog)
WHERE a.entityType = 'Policy' AND a.entityId IS NOT NULL
MATCH (p:Policy {name: a.entityId})
MERGE (a)-[:AUDITS]->(p);

// Create AUDITS relationships for System entities
MATCH (a:AuditLog)
WHERE a.entityType = 'System' AND a.entityId IS NOT NULL
MATCH (s:System {name: a.entityId})
MERGE (a)-[:AUDITS]->(s);

// Create AUDITS relationships for Version entities
// Version entityId format: "TechnologyName:version"
MATCH (a:AuditLog)
WHERE a.entityType = 'Version' AND a.entityId IS NOT NULL
WITH a, split(a.entityId, ':') AS parts
WHERE size(parts) = 2
MATCH (v:Version {technologyName: parts[0], version: parts[1]})
MERGE (a)-[:AUDITS]->(v);

// Create index on AUDITS relationship for efficient queries
CREATE INDEX audit_audits IF NOT EXISTS
FOR ()-[r:AUDITS]-() ON (r.createdAt);
