/*
 * Rollback: Restore Version Node
 *
 * Recreates the Version node constraint and indexes. Note: this does not
 * restore any Version data that was deleted, and does not restore the
 * version-level-approval query logic in teams/check-approval.cypher or
 * teams/find-approvals.cypher — that capability was deliberately retired,
 * not just schema-cleaned, so reintroducing it requires re-adding the
 * query logic and test coverage as well.
 */

CREATE CONSTRAINT version_tech_version_unique IF NOT EXISTS
FOR (v:Version)
REQUIRE (v.technologyName, v.version) IS UNIQUE;

CREATE INDEX version_approved IF NOT EXISTS
FOR (v:Version)
ON (v.approved);

CREATE INDEX version_eol_date IF NOT EXISTS
FOR (v:Version)
ON (v.eolDate);
