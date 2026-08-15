/*
 * Rollback Migration: remove_platform_node
 * Version: 20260815.193608
 *
 * This script rolls back the changes made in 20260815_193608_remove_platform_node.up.cypher
 */

// Rollback: intentionally partial.
//
// This migration deleted all Platform nodes and their STEWARDED_BY/APPROVES
// relationships. Deleted nodes cannot be resurrected -- Cypher migrations are
// not a backup mechanism, and the up-migration deliberately did not write
// AuditLog entries for what was deleted (see up.cypher description).
//
// Only the constraint is restored here, so a future re-application of
// 20260702_150000 (or manual node creation) is possible without a uniqueness
// conflict. No node/relationship data is recreated.

CREATE CONSTRAINT platform_name_unique IF NOT EXISTS
FOR (p:Platform)
REQUIRE p.name IS UNIQUE;
