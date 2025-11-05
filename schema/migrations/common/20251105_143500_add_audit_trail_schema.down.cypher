/*
 * Rollback Migration: Remove Audit Trail Schema
 * Version: 2025.11.05.143500
 * Author: GitHub Copilot
 * 
 * Description:
 * Removes the audit trail schema added by 20251105_143500_add_audit_trail_schema.up.cypher
 * 
 * WARNING: This will delete all audit log data. Make sure to back up audit logs before rolling back.
 */

// ============================================================================
// DROP INDEXES
// ============================================================================

DROP INDEX audit_log_timestamp IF EXISTS;
DROP INDEX audit_log_entity_type IF EXISTS;
DROP INDEX audit_log_entity_id IF EXISTS;
DROP INDEX audit_log_operation IF EXISTS;
DROP INDEX audit_log_user_id IF EXISTS;
DROP INDEX audit_log_source IF EXISTS;
DROP INDEX audit_log_entity_composite IF EXISTS;

// ============================================================================
// DROP CONSTRAINTS
// ============================================================================

DROP CONSTRAINT audit_log_id_unique IF EXISTS;

// ============================================================================
// DELETE AUDIT LOG NODES
// ============================================================================

// Remove all audit log nodes
// WARNING: This deletes all audit history
MATCH (a:AuditLog)
DETACH DELETE a;
