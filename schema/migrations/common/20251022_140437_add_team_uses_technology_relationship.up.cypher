/*
 * Migration: Add Team USES Technology Relationship
 * Version: 2025.10.22.140437
 * Author: Ona
 * 
 * Description:
 * Adds USES relationship between Team and Technology to track actual usage
 * (as opposed to APPROVES which tracks approval/permission).
 * 
 * This relationship is inferred from system ownership:
 * - Team owns System
 * - System uses Component
 * - Component is version of Technology
 * - Therefore: Team uses Technology
 * 
 * Properties:
 * - firstUsed: When the team first started using this technology
 * - lastVerified: When the usage was last verified
 * - systemCount: Number of systems using this technology
 * 
 * Rollback: See 20251022_140437_add_team_uses_technology_relationship.down.cypher
 */

// Create index on USES relationship for performance
CREATE INDEX team_uses_technology_first_used IF NOT EXISTS
FOR ()-[r:USES]-()
ON (r.firstUsed);

CREATE INDEX team_uses_technology_last_verified IF NOT EXISTS
FOR ()-[r:USES]-()
ON (r.lastVerified);

// Create USES relationships based on current system ownership
// This infers actual usage from the system dependency graph
MATCH (team:Team)-[:OWNS]->(sys:System)
MATCH (sys)-[:USES]->(comp:Component)
MATCH (comp)-[:IS_VERSION_OF]->(tech:Technology)
WITH team, tech, 
     count(DISTINCT sys) as systemCount,
     min(sys.createdAt) as firstUsed
MERGE (team)-[u:USES]->(tech)
ON CREATE SET
  u.firstUsed = COALESCE(firstUsed, datetime()),
  u.lastVerified = datetime(),
  u.systemCount = systemCount
ON MATCH SET
  u.lastVerified = datetime(),
  u.systemCount = systemCount;
