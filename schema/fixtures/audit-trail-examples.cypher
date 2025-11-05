/*
 * Audit Trail Example Queries
 * 
 * This file contains example Cypher queries for working with audit logs.
 * These queries demonstrate common audit trail use cases.
 */

// ============================================================================
// BASIC AUDIT QUERIES
// ============================================================================

// Get all audit logs (most recent first)
MATCH (a:AuditLog)
RETURN a
ORDER BY a.timestamp DESC
LIMIT 100;

// Get audit logs for the last 24 hours
MATCH (a:AuditLog)
WHERE a.timestamp >= datetime() - duration('P1D')
RETURN a
ORDER BY a.timestamp DESC;

// Get audit logs for a specific date range
MATCH (a:AuditLog)
WHERE a.timestamp >= datetime('2025-11-01T00:00:00Z')
  AND a.timestamp < datetime('2025-11-08T00:00:00Z')
RETURN a
ORDER BY a.timestamp DESC;

// ============================================================================
// ENTITY-SPECIFIC QUERIES
// ============================================================================

// Get all changes to a specific technology
MATCH (a:AuditLog)
WHERE a.entityType = 'Technology' AND a.entityId = 'React'
RETURN a
ORDER BY a.timestamp DESC;

// Get all changes to any technology
MATCH (a:AuditLog)
WHERE a.entityType = 'Technology'
RETURN a
ORDER BY a.timestamp DESC;

// Get all changes to a specific system
MATCH (a:AuditLog)
WHERE a.entityType = 'System' AND a.entityId = 'API Gateway'
RETURN a
ORDER BY a.timestamp DESC;

// Get complete audit trail for an entity with user information
MATCH (a:AuditLog)-[:PERFORMED_BY]->(u:User)
WHERE a.entityType = 'Technology' AND a.entityId = 'React'
RETURN a.timestamp as when,
       a.operation as operation,
       u.name as who,
       u.email as whoEmail,
       a.changes as changes,
       a.reason as reason,
       a.source as source
ORDER BY a.timestamp DESC;

// ============================================================================
// OPERATION-SPECIFIC QUERIES
// ============================================================================

// Get all CREATE operations
MATCH (a:AuditLog)
WHERE a.operation = 'CREATE'
RETURN a
ORDER BY a.timestamp DESC;

// Get all approval-related operations
MATCH (a:AuditLog)
WHERE a.operation IN ['APPROVE', 'REJECT', 'REVOKE']
RETURN a
ORDER BY a.timestamp DESC;

// Get all deletions
MATCH (a:AuditLog)
WHERE a.operation = 'DELETE'
RETURN a
ORDER BY a.timestamp DESC;

// Get all SBOM-related operations
MATCH (a:AuditLog)
WHERE a.operation IN ['SBOM_UPLOAD', 'COMPONENT_DISCOVERED', 'VULNERABILITY_DETECTED']
RETURN a
ORDER BY a.timestamp DESC;

// ============================================================================
// USER-SPECIFIC QUERIES
// ============================================================================

// Get all changes by a specific user
MATCH (a:AuditLog)
WHERE a.userId = 'user123'
RETURN a
ORDER BY a.timestamp DESC;

// Get all changes by a specific user with user details
MATCH (a:AuditLog)-[:PERFORMED_BY]->(u:User)
WHERE a.userId = 'user123'
RETURN a, u
ORDER BY a.timestamp DESC;

// Get user activity summary
MATCH (a:AuditLog)
WHERE a.userId = 'user123'
WITH a.operation as operation, count(*) as count
RETURN operation, count
ORDER BY count DESC;

// Get all users who modified a specific entity
MATCH (a:AuditLog)-[:PERFORMED_BY]->(u:User)
WHERE a.entityType = 'Technology' AND a.entityId = 'React'
RETURN DISTINCT u.name as user, u.email as email, count(a) as changes
ORDER BY changes DESC;

// ============================================================================
// FIELD-SPECIFIC QUERIES
// ============================================================================

// Get all changes to a specific field
MATCH (a:AuditLog)
WHERE 'status' IN a.changedFields
RETURN a
ORDER BY a.timestamp DESC;

// Get all changes to approval status
MATCH (a:AuditLog)
WHERE 'timeCategory' IN a.changedFields OR 'approved' IN a.changedFields
RETURN a
ORDER BY a.timestamp DESC;

// Get all changes that modified multiple fields
MATCH (a:AuditLog)
WHERE size(a.changedFields) > 1
RETURN a
ORDER BY a.timestamp DESC;

// ============================================================================
// SOURCE-SPECIFIC QUERIES
// ============================================================================

// Get all changes from UI
MATCH (a:AuditLog)
WHERE a.source = 'UI'
RETURN a
ORDER BY a.timestamp DESC;

// Get all changes from API
MATCH (a:AuditLog)
WHERE a.source = 'API'
RETURN a
ORDER BY a.timestamp DESC;

// Get all changes from SBOM processing
MATCH (a:AuditLog)
WHERE a.source = 'SBOM'
RETURN a
ORDER BY a.timestamp DESC;

// Get source breakdown
MATCH (a:AuditLog)
RETURN a.source as source, count(*) as count
ORDER BY count DESC;

// ============================================================================
// COMPLIANCE AND SECURITY QUERIES
// ============================================================================

// Get all approval changes in the last 30 days
MATCH (a:AuditLog)
WHERE a.operation IN ['APPROVE', 'REJECT', 'REVOKE']
  AND a.timestamp >= datetime() - duration('P30D')
RETURN a
ORDER BY a.timestamp DESC;

// Get all changes from unusual IP addresses (example pattern)
MATCH (a:AuditLog)
WHERE a.ipAddress IS NOT NULL
  AND NOT a.ipAddress STARTS WITH '192.168.'
  AND NOT a.ipAddress STARTS WITH '10.'
RETURN a
ORDER BY a.timestamp DESC;

// Get all system deletions
MATCH (a:AuditLog)
WHERE a.entityType = 'System' AND a.operation = 'DELETE'
RETURN a
ORDER BY a.timestamp DESC;

// Get all role changes
MATCH (a:AuditLog)
WHERE a.operation = 'ROLE_CHANGE'
RETURN a
ORDER BY a.timestamp DESC;

// ============================================================================
// CORRELATION AND SESSION QUERIES
// ============================================================================

// Get all changes in a specific session
MATCH (a:AuditLog)
WHERE a.sessionId = 'session123'
RETURN a
ORDER BY a.timestamp ASC;

// Get all correlated changes (same correlationId)
MATCH (a:AuditLog)
WHERE a.correlationId = 'corr456'
RETURN a
ORDER BY a.timestamp ASC;

// Get changes grouped by session
MATCH (a:AuditLog)
WHERE a.sessionId IS NOT NULL
WITH a.sessionId as session, collect(a) as changes
RETURN session, size(changes) as changeCount, 
       head(changes).timestamp as firstChange,
       last(changes).timestamp as lastChange
ORDER BY changeCount DESC;

// ============================================================================
// AGGREGATE AND STATISTICAL QUERIES
// ============================================================================

// Get operation breakdown
MATCH (a:AuditLog)
RETURN a.operation as operation, count(*) as count
ORDER BY count DESC;

// Get entity type breakdown
MATCH (a:AuditLog)
RETURN a.entityType as entityType, count(*) as count
ORDER BY count DESC;

// Get most active users
MATCH (a:AuditLog)
RETURN a.userId as user, a.userName as name, count(*) as actions
ORDER BY actions DESC
LIMIT 10;

// Get most modified entities
MATCH (a:AuditLog)
RETURN a.entityType as type, a.entityId as entity, count(*) as changes
ORDER BY changes DESC
LIMIT 20;

// Get audit activity by day
MATCH (a:AuditLog)
WHERE a.timestamp >= datetime() - duration('P30D')
RETURN date(a.timestamp) as day, count(*) as changes
ORDER BY day DESC;

// Get audit activity by hour
MATCH (a:AuditLog)
WHERE a.timestamp >= datetime() - duration('P1D')
WITH a.timestamp.hour as hour, count(*) as changes
RETURN hour, changes
ORDER BY hour;

// ============================================================================
// BEFORE/AFTER COMPARISON QUERIES
// ============================================================================

// Get changes with before/after values for a field
MATCH (a:AuditLog)
WHERE 'status' IN a.changedFields
RETURN a.entityType as type,
       a.entityId as entity,
       a.timestamp as when,
       a.changes.status.before as oldStatus,
       a.changes.status.after as newStatus,
       a.userName as who
ORDER BY a.timestamp DESC;

// Get all changes that moved status from 'draft' to 'active'
MATCH (a:AuditLog)
WHERE 'status' IN a.changedFields
  AND a.changes.status.before = 'draft'
  AND a.changes.status.after = 'active'
RETURN a
ORDER BY a.timestamp DESC;

// ============================================================================
// TAGGING AND CATEGORIZATION QUERIES
// ============================================================================

// Get all audits with a specific tag
MATCH (a:AuditLog)
WHERE 'security' IN a.tags
RETURN a
ORDER BY a.timestamp DESC;

// Get all audits with multiple tags
MATCH (a:AuditLog)
WHERE 'critical' IN a.tags AND 'compliance' IN a.tags
RETURN a
ORDER BY a.timestamp DESC;

// Get tag usage statistics
MATCH (a:AuditLog)
WHERE a.tags IS NOT NULL
UNWIND a.tags as tag
RETURN tag, count(*) as usage
ORDER BY usage DESC;

// ============================================================================
// RETENTION AND CLEANUP QUERIES
// ============================================================================

// Count audit logs older than 1 year
MATCH (a:AuditLog)
WHERE a.timestamp < datetime() - duration('P365D')
RETURN count(a) as oldLogs;

// Find oldest audit log
MATCH (a:AuditLog)
RETURN a
ORDER BY a.timestamp ASC
LIMIT 1;

// Get audit log storage statistics
MATCH (a:AuditLog)
RETURN count(a) as totalLogs,
       min(a.timestamp) as oldest,
       max(a.timestamp) as newest;

// ============================================================================
// COMPLEX ANALYTICAL QUERIES
// ============================================================================

// Get approval timeline for a technology
MATCH (a:AuditLog)
WHERE a.entityType = 'Technology' 
  AND a.entityId = 'React'
  AND a.operation IN ['APPROVE', 'REJECT', 'REVOKE']
RETURN a.timestamp as when,
       a.operation as action,
       a.userName as who,
       a.changes as details
ORDER BY a.timestamp ASC;

// Get technology lifecycle events
MATCH (a:AuditLog)
WHERE a.entityType = 'Technology' AND a.entityId = 'React'
  AND a.operation IN ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REVOKE', 'ARCHIVE']
RETURN a.timestamp as when,
       a.operation as lifecycle,
       a.userName as actor,
       a.reason as reason
ORDER BY a.timestamp ASC;

// Get team ownership changes for a system
MATCH (a:AuditLog)
WHERE a.entityType = 'System' 
  AND a.entityId = 'API Gateway'
  AND 'ownerTeam' IN a.changedFields
RETURN a.timestamp as when,
       a.changes.ownerTeam.before as previousOwner,
       a.changes.ownerTeam.after as newOwner,
       a.userName as changedBy,
       a.reason as reason
ORDER BY a.timestamp DESC;

// Get vulnerability detection history for a component
MATCH (a:AuditLog)
WHERE a.entityType = 'Component'
  AND a.operation IN ['VULNERABILITY_DETECTED', 'VULNERABILITY_RESOLVED']
RETURN a.timestamp as when,
       a.entityId as component,
       a.operation as event,
       a.metadata.vulnerabilityId as cve,
       a.metadata.severity as severity
ORDER BY a.timestamp DESC;
