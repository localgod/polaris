// Rollback: Remove User node and related constraints/indexes

// Drop indexes
DROP INDEX user_last_login IF EXISTS;
DROP INDEX user_role IF EXISTS;
DROP INDEX user_provider IF EXISTS;
DROP INDEX user_email IF EXISTS;

// Drop constraint
DROP CONSTRAINT user_id_unique IF EXISTS;

// Delete all User nodes and their relationships
MATCH (u:User)
DETACH DELETE u;
