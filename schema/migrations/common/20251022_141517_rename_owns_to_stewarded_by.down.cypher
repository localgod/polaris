/*
 * Rollback Migration: Rename OWNS to STEWARDED_BY
 * Version: 2025.10.22.141517
 * 
 * This script rolls back the changes made in 20251022_141517_rename_owns_to_stewarded_by.up.cypher
 */

// Rename STEWARDED_BY back to OWNS for Technology
MATCH (team:Team)-[s:STEWARDED_BY]->(tech:Technology)
CREATE (team)-[r:OWNS]->(tech)
DELETE s;
