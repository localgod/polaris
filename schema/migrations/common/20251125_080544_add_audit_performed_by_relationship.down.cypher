/*
 * Rollback: Remove PERFORMED_BY Relationship from AuditLog
 * 
 * Removes all PERFORMED_BY relationships from AuditLog nodes.
 * The userId property is preserved for potential re-creation.
 */

// Drop relationship index
DROP INDEX audit_performed_by IF EXISTS;

// Remove all PERFORMED_BY relationships from AuditLog
MATCH (a:AuditLog)-[r:PERFORMED_BY]->()
DELETE r;
