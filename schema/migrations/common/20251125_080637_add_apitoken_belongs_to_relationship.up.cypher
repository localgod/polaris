/*
 * Migration: Add BELONGS_TO Relationship to ApiToken
 * Version: 2025.11.25.080637
 * Author: @ona
 * 
 * Description:
 * Creates BELONGS_TO relationship from ApiToken to User nodes.
 * This enables graph queries to find all API tokens owned by a user
 * and provides proper token ownership tracking.
 *
 * The relationship is created based on the existing userId property
 * in ApiToken nodes.
 *
 * Dependencies:
 * - User nodes must exist
 * - ApiToken nodes must have userId property
 *
 * Rollback: See corresponding .down.cypher file
 */

// Create BELONGS_TO relationships for existing API tokens
MATCH (t:ApiToken)
WHERE t.userId IS NOT NULL
MATCH (u:User {id: t.userId})
MERGE (t)-[:BELONGS_TO]->(u);

// Create index on BELONGS_TO relationship for efficient queries
CREATE INDEX apitoken_belongs_to IF NOT EXISTS
FOR ()-[r:BELONGS_TO]-() ON (r.createdAt);
