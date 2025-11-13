/*
 * Rollback Migration: api-token-schema
 * Version: 20251113.142003
 * 
 * This script rolls back the changes made in 20251113_142003_api-token-schema.up.cypher
 */

// Rollback: Remove ApiToken node and related constraints/indexes

// Drop indexes
DROP INDEX api_token_revoked IF EXISTS;
DROP INDEX api_token_hash IF EXISTS;

// Drop constraint
DROP CONSTRAINT api_token_id_unique IF EXISTS;

// Delete all ApiToken nodes and their relationships
MATCH (t:ApiToken)
DETACH DELETE t;
