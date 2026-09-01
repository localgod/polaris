/*
 * Rollback: centralize_time_governance
 * Version: 20260817.000000
 *
 * Removes the organization-level TIME policy model introduced in the
 * corresponding .up migration.  Legacy APPROVES data is left intact.
 */

// Remove all policy-related nodes (detach deletes relationships too)
MATCH (q:PolicyReviewQueue) DETACH DELETE q;
MATCH (e:PolicyException) DETACH DELETE e;
MATCH (p:TechnologyPolicy) DETACH DELETE p;
MATCH (o:Organization) DETACH DELETE o;

DROP INDEX technology_policy_governs_status IF EXISTS;
DROP CONSTRAINT policy_review_queue_id_unique IF EXISTS;
DROP CONSTRAINT policy_exception_id_unique IF EXISTS;
DROP CONSTRAINT technology_policy_id_unique IF EXISTS;
DROP CONSTRAINT organization_name_unique IF EXISTS;

// Remove backfilled orgAdmin flag
MATCH (u:User)
REMOVE u.orgAdmin;
