/*
 * Migration: Remove versionConstraint from APPROVES relationships
 * Version: 2026.02.19.111300
 *
 * Description:
 * Removes the versionConstraint property from (Team)-[:APPROVES]->(Technology)
 * relationships. This field was never used in violation detection or any query
 * logic. Version enforcement is handled by version-constraint policies instead.
 *
 * Rollback: See 20260219_111300_remove_approves_version_constraint.down.cypher
 */

MATCH ()-[a:APPROVES]->()
WHERE a.versionConstraint IS NOT NULL
REMOVE a.versionConstraint;
