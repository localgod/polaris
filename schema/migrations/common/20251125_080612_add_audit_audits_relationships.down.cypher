/*
 * Rollback: Remove AUDITS Relationships from AuditLog
 * 
 * Removes all AUDITS relationships from AuditLog nodes.
 * The entityType and entityId properties are preserved for potential re-creation.
 */

// Drop relationship index
DROP INDEX audit_audits IF EXISTS;

// Remove all AUDITS relationships from AuditLog
MATCH (a:AuditLog)-[r:AUDITS]->()
DELETE r;
