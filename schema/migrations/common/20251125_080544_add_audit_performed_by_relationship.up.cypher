/*
 * Migration: Add PERFORMED_BY Relationship to AuditLog
 * Version: 2025.11.25.080544
 * Author: @ona
 * 
 * Description:
 * Creates PERFORMED_BY relationship from AuditLog to User nodes.
 * This enables graph queries to find all actions performed by a user
 * and provides proper graph-based audit trail functionality.
 *
 * The relationship is created based on the existing userId property
 * in AuditLog nodes.
 *
 * Dependencies:
 * - User nodes must exist
 * - AuditLog nodes must have userId property
 *
 * Rollback: See corresponding .down.cypher file
 */

// Create PERFORMED_BY relationships for existing audit logs
MATCH (a:AuditLog)
WHERE a.userId IS NOT NULL
MATCH (u:User {id: a.userId})
MERGE (a)-[:PERFORMED_BY]->(u);

// Create index on PERFORMED_BY relationship for efficient queries
// Note: Relationship indexes require Neo4j 5.0+
// If using older version, this will fail gracefully
CREATE INDEX audit_performed_by IF NOT EXISTS
FOR ()-[r:PERFORMED_BY]-() ON (r.createdAt);
