/*
 * Migration: centralize_time_governance
 * Version: 20260817.000000
 *
 * Introduces the organization-level TIME policy model per ADR-0008.
 *
 * New node types:
 *   Organization  — singleton; carries no business properties beyond `name`
 *   TechnologyPolicy — one authoritative TIME decision per Technology
 *   PolicyException  — scoped, temporary deviation from an org policy
 *   PolicyReviewQueue — flags a Technology whose legacy team approvals
 *                        conflict and need manual review before a policy
 *                        can be activated
 *
 * Relationships added by this migration (data seeded by the companion
 * migration 20260817_100000_migrate_approvals_to_policies):
 *   (Organization)-[:SETS]->(TechnologyPolicy)
 *   (TechnologyPolicy)-[:GOVERNS]->(Technology)
 *   (PolicyException)-[:OVERRIDES]->(TechnologyPolicy)
 *   (PolicyException)-[:APPLIES_TO]->(Team|System)
 *
 * User.orgAdmin (boolean) is set on existing User nodes at the end of
 * this migration.  Authorization: orgAdmin=true users may activate,
 * archive, and create/revoke exceptions.  Superusers retain full access.
 *
 * Rollback: see 20260817_000000_centralize_time_governance.down.cypher
 */

// ── Organization singleton ────────────────────────────────────────────────────

MERGE (:Organization {name: 'default'});

CREATE CONSTRAINT organization_name_unique IF NOT EXISTS
FOR (o:Organization)
REQUIRE o.name IS UNIQUE;

// ── TechnologyPolicy ──────────────────────────────────────────────────────────

CREATE CONSTRAINT technology_policy_id_unique IF NOT EXISTS
FOR (p:TechnologyPolicy)
REQUIRE p.id IS UNIQUE;

// Fast lookup of the active policy for a given Technology
CREATE INDEX technology_policy_status IF NOT EXISTS
FOR (p:TechnologyPolicy)
ON (p.status);

// ── PolicyException ───────────────────────────────────────────────────────────

CREATE CONSTRAINT policy_exception_id_unique IF NOT EXISTS
FOR (e:PolicyException)
REQUIRE e.id IS UNIQUE;

// ── PolicyReviewQueue ─────────────────────────────────────────────────────────

CREATE CONSTRAINT policy_review_queue_id_unique IF NOT EXISTS
FOR (q:PolicyReviewQueue)
REQUIRE q.id IS UNIQUE;

// ── User.orgAdmin default ─────────────────────────────────────────────────────

// Backfill orgAdmin = false on all existing User nodes.
// Deliberately not inherited from superuser — the two roles are distinct.
MATCH (u:User)
WHERE u.orgAdmin IS NULL
SET u.orgAdmin = false;
