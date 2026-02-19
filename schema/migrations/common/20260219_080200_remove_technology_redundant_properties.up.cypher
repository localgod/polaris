/*
 * Migration: Remove Redundant Technology Node Properties
 * Version: 2026.02.19.080200
 *
 * Description:
 * Removes ownerTeam, approvedVersionRange, and riskLevel properties from
 * Technology nodes. ownerTeam is redundant with the (Team)-[:OWNS]->(Technology)
 * relationship. approvedVersionRange and riskLevel were never used in queries
 * and have no relationship-based equivalent — they are dropped entirely.
 *
 * Dependencies:
 * - 20251203_082940_cleanup_unused_indexes (indexes already dropped)
 *
 * Rollback: See 20260219_080200_remove_technology_redundant_properties.down.cypher
 */

// Remove ownerTeam property — OWNS relationship is the source of truth
MATCH (t:Technology)
WHERE t.ownerTeam IS NOT NULL
REMOVE t.ownerTeam;

// Remove approvedVersionRange property — unused
MATCH (t:Technology)
WHERE t.approvedVersionRange IS NOT NULL
REMOVE t.approvedVersionRange;

// Remove riskLevel property — unused
MATCH (t:Technology)
WHERE t.riskLevel IS NOT NULL
REMOVE t.riskLevel;
