/*
 * Migration: Add Audit Trail Schema
 * Version: 2025.11.05.143500
 * Author: GitHub Copilot
 * 
 * Description:
 * Creates the audit trail schema for tracking all data changes in the system.
 * This enables comprehensive audit logging for compliance, security, and debugging.
 *
 * The audit system tracks:
 * - What changed (entity type, entity identifier, operation type)
 * - When it changed (timestamp with high precision)
 * - Who changed it (user who initiated the change)
 * - What the changes were (field-level before/after values)
 * - Why it changed (reason, context, source)
 * - Where it came from (IP address, user agent)
 *
 * Node Types:
 * - AuditLog: Records of data changes
 *
 * Relationships:
 * - (AuditLog)-[:PERFORMED_BY]->(User) - Links audit entry to user
 * - (AuditLog)-[:AUDITS]->(Entity) - Links audit entry to affected entity
 *
 * Dependencies:
 * - 20251024_074821_add_user_node.up.cypher (User node must exist)
 *
 * Rollback: See 20251105_143500_add_audit_trail_schema.down.cypher
 */

// ============================================================================
// AUDIT LOG NODE
// ============================================================================

// Unique constraint on audit log ID (UUID)
CREATE CONSTRAINT audit_log_id_unique IF NOT EXISTS
FOR (a:AuditLog)
REQUIRE a.id IS UNIQUE;

// Index on timestamp for chronological queries
CREATE INDEX audit_log_timestamp IF NOT EXISTS
FOR (a:AuditLog)
ON (a.timestamp);

// Index on entityType for filtering by entity type
CREATE INDEX audit_log_entity_type IF NOT EXISTS
FOR (a:AuditLog)
ON (a.entityType);

// Index on entityId for finding all changes to a specific entity
CREATE INDEX audit_log_entity_id IF NOT EXISTS
FOR (a:AuditLog)
ON (a.entityId);

// Index on operation for filtering by operation type
CREATE INDEX audit_log_operation IF NOT EXISTS
FOR (a:AuditLog)
ON (a.operation);

// Index on userId for finding all actions by a user
CREATE INDEX audit_log_user_id IF NOT EXISTS
FOR (a:AuditLog)
ON (a.userId);

// Index on source for filtering by data source
CREATE INDEX audit_log_source IF NOT EXISTS
FOR (a:AuditLog)
ON (a.source);

// Composite index for entity-specific audit queries
CREATE INDEX audit_log_entity_composite IF NOT EXISTS
FOR (a:AuditLog)
ON (a.entityType, a.entityId, a.timestamp);

// ============================================================================
// AUDIT LOG PROPERTIES
// ============================================================================

// AuditLog properties:
// 
// Core Identity:
//   - id: String (UUID) - Unique identifier for the audit entry
//   - timestamp: DateTime - When the change occurred (high precision)
//   - operation: String - Type of operation (CREATE, UPDATE, DELETE, APPROVE, REJECT, etc.)
//
// Entity Information:
//   - entityType: String - Type of entity that changed (Technology, System, Team, etc.)
//   - entityId: String - Unique identifier of the entity (name, ID, etc.)
//   - entityLabel: String (optional) - Human-readable label for the entity
//
// Change Details:
//   - changes: Map - Field-level changes as key-value pairs
//       Example: {status: {before: "draft", after: "active"}, name: {before: "old", after: "new"}}
//   - changedFields: List<String> - List of field names that changed (for quick filtering)
//   - previousState: Map (optional) - Complete state before the change
//   - currentState: Map (optional) - Complete state after the change
//
// Actor Information:
//   - userId: String - ID of the user who performed the action
//   - userName: String (optional) - Name of the user at the time of action
//   - userEmail: String (optional) - Email of the user at the time of action
//
// Context & Metadata:
//   - reason: String (optional) - User-provided reason for the change
//   - source: String - Source of the change (UI, API, SBOM, MIGRATION, SYSTEM)
//   - ipAddress: String (optional) - IP address of the client
//   - userAgent: String (optional) - User agent string of the client
//   - sessionId: String (optional) - Session identifier for grouping related changes
//   - correlationId: String (optional) - For tracking changes across multiple entities
//   - requestId: String (optional) - API request identifier
//
// Additional Metadata:
//   - metadata: Map (optional) - Additional context-specific information
//   - tags: List<String> (optional) - Tags for categorization and filtering

// ============================================================================
// OPERATION TYPES
// ============================================================================

// Standard CRUD operations:
//   - CREATE: Entity was created
//   - UPDATE: Entity was modified
//   - DELETE: Entity was deleted (soft or hard delete)
//   - RESTORE: Entity was restored from deleted state
//
// Approval operations:
//   - APPROVE: Technology/Version approved by team
//   - REJECT: Technology/Version rejected by team
//   - REVOKE: Approval was revoked
//
// Relationship operations:
//   - LINK: Relationship was created
//   - UNLINK: Relationship was removed
//
// Status changes:
//   - ACTIVATE: Entity was activated
//   - DEACTIVATE: Entity was deactivated
//   - ARCHIVE: Entity was archived
//
// User operations:
//   - LOGIN: User logged in
//   - LOGOUT: User logged out
//   - ROLE_CHANGE: User role was changed
//
// SBOM operations:
//   - SBOM_UPLOAD: SBOM was uploaded
//   - COMPONENT_DISCOVERED: Component was discovered in SBOM
//   - VULNERABILITY_DETECTED: Vulnerability was detected
//   - VULNERABILITY_RESOLVED: Vulnerability was resolved

// ============================================================================
// ENTITY TYPES
// ============================================================================

// Supported entity types for audit logging:
//   - Technology
//   - Version
//   - Component
//   - System
//   - Team
//   - Policy
//   - User
//   - Repository
//   - License
//   - Vulnerability
//   - Hash
//   - ExternalReference

// ============================================================================
// SOURCES
// ============================================================================

// Where the change originated:
//   - UI: User interface (web application)
//   - API: REST API endpoint
//   - SBOM: SBOM upload/processing
//   - MIGRATION: Database migration script
//   - SYSTEM: System-generated change (e.g., automatic updates)
//   - CLI: Command-line interface
//   - INTEGRATION: External system integration

// ============================================================================
// EXAMPLE QUERIES
// ============================================================================

// Find all changes to a specific technology:
// MATCH (a:AuditLog)
// WHERE a.entityType = 'Technology' AND a.entityId = 'React'
// RETURN a
// ORDER BY a.timestamp DESC

// Find all changes by a specific user:
// MATCH (a:AuditLog)
// WHERE a.userId = 'user123'
// RETURN a
// ORDER BY a.timestamp DESC

// Find all approval changes:
// MATCH (a:AuditLog)
// WHERE a.operation IN ['APPROVE', 'REJECT', 'REVOKE']
// RETURN a
// ORDER BY a.timestamp DESC

// Find all changes in the last 24 hours:
// MATCH (a:AuditLog)
// WHERE a.timestamp >= datetime() - duration('P1D')
// RETURN a
// ORDER BY a.timestamp DESC

// Find all changes to a specific field:
// MATCH (a:AuditLog)
// WHERE 'status' IN a.changedFields
// RETURN a
// ORDER BY a.timestamp DESC

// Get audit trail for a specific entity with user info:
// MATCH (a:AuditLog)-[:PERFORMED_BY]->(u:User)
// WHERE a.entityType = 'Technology' AND a.entityId = 'React'
// RETURN a, u
// ORDER BY a.timestamp DESC
