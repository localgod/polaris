/*
 * Migration: Rename OWNS to STEWARDED_BY
 * Version: 2025.10.22.141517
 * Author: Ona
 * 
 * Description:
 * Renames OWNS relationship to STEWARDED_BY for clearer semantics.
 * 
 * OWNS was ambiguous - it could mean:
 * - Technical stewardship (defining standards)
 * - Operational ownership (running systems)
 * - Governance responsibility
 * 
 * STEWARDED_BY clearly indicates technical stewardship and governance
 * responsibility without implying operational ownership.
 * 
 * Changes:
 * - Team -[:OWNS]-> Technology becomes Team -[:STEWARDED_BY]-> Technology
 * - Team -[:OWNS]-> System remains as OWNS (operational ownership)
 * 
 * Note: Only Technology stewardship is renamed. System ownership
 * remains OWNS as it represents operational responsibility.
 * 
 * Rollback: See 20251022_141517_rename_owns_to_stewarded_by.down.cypher
 */

// Rename OWNS to STEWARDED_BY for Technology stewardship
MATCH (team:Team)-[r:OWNS]->(tech:Technology)
CREATE (team)-[s:STEWARDED_BY]->(tech)
DELETE r;
