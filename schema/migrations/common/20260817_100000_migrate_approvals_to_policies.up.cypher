/*
 * Migration: migrate_approvals_to_policies
 * Version: 20260817.100000
 *
 * Converts legacy team-level APPROVES TIME values into draft TechnologyPolicy
 * nodes where all existing team approvals agree on the same TIME value.
 *
 * When teams disagree, a PolicyReviewQueue node is created to flag the
 * Technology for manual review — no policy is auto-created in that case,
 * and the Technology remains 'unclassified' until an org-admin activates
 * a policy manually.
 *
 * All APPROVES relationships gain a `migratedAt` timestamp to record that
 * they have been processed by this migration. They remain in the graph as
 * read-only history.
 *
 * Dependencies:
 *   20260817_000000_centralize_time_governance (Organization node, TechnologyPolicy constraint)
 *
 * Rollback: see 20260817_100000_migrate_approvals_to_policies.down.cypher
 */

MATCH (o:Organization {name: 'default'})

// For each Technology, collect all distinct TIME values from active APPROVES relationships
MATCH (tech:Technology)
OPTIONAL MATCH (:Team)-[a:APPROVES]->(tech)
  WHERE a.deprecatedAt IS NULL  // only consider non-deprecated approvals
WITH o, tech, collect(DISTINCT a.time) AS timeValues

// Stamp all APPROVES relationships as processed (whether we create a policy or not)
OPTIONAL MATCH (:Team)-[stamp:APPROVES]->(tech)
SET stamp.migratedAt = datetime()

WITH o, tech, timeValues,
     [v IN timeValues WHERE v IN ['tolerate', 'invest', 'migrate', 'eliminate']] AS validValues

// Unanimous: create a draft policy
FOREACH (_ IN CASE WHEN size(validValues) = 1 THEN [1] ELSE [] END |
  MERGE (o)-[:SETS]->(p:TechnologyPolicy {id: randomUUID()})-[:GOVERNS]->(tech)
  ON CREATE SET
    p.time = validValues[0],
    p.rationale = 'Migrated from unanimous team approvals',
    p.migrationTarget = null,
    p.status = 'draft',
    p.effectiveDate = null,
    p.expiryDate = null,
    p.createdBy = 'migration',
    p.createdByName = 'Migration (unanimous)',
    p.createdAt = datetime(),
    p.updatedAt = datetime()
)

// Conflicting or missing: create a review queue entry
FOREACH (_ IN CASE WHEN size(validValues) <> 1 THEN [1] ELSE [] END |
  MERGE (q:PolicyReviewQueue {id: randomUUID()})
  ON CREATE SET
    q.technologyName = tech.name,
    q.conflictingValues = validValues,
    q.reviewedAt = null,
    q.createdAt = datetime()
  MERGE (q)-[:REFERENCES]->(tech)
)
