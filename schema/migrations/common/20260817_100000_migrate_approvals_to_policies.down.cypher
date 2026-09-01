/*
 * Rollback: migrate_approvals_to_policies
 * Version: 20260817.100000
 *
 * Removes draft TechnologyPolicy nodes created by this migration (those with
 * createdBy = 'migration') and all PolicyReviewQueue nodes. Does NOT remove
 * the `migratedAt` timestamps from APPROVES relationships — those are harmless
 * and removing them would require traversing the entire graph again.
 */

// Remove migration-created draft policies
MATCH (p:TechnologyPolicy {createdBy: 'migration', status: 'draft'})
DETACH DELETE p;

// Remove all review queue entries
MATCH (q:PolicyReviewQueue)
DETACH DELETE q;
