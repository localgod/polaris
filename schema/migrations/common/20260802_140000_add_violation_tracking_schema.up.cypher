/*
 * Migration: Add violation tracking schema
 * Version: 20260802.140000
 *
 * Adds LicenseViolation/ComplianceViolation/VersionConstraintViolation nodes
 * (a detection->resolution lifecycle for each of the three violation types,
 * populated by the violations:reconcile scheduled task) and a Waiver node
 * that can attach to any of them via a WAIVES relationship.
 *
 * Natural-key identity is stored as a single synthetic `naturalKey` string
 * property (Neo4j Community Edition supports single-property uniqueness
 * constraints only, not composite/node-key constraints), mirroring how
 * Component.purl is used as a single-property merge key elsewhere.
 */

CREATE CONSTRAINT license_violation_natural_key_unique IF NOT EXISTS
FOR (v:LicenseViolation)
REQUIRE v.naturalKey IS UNIQUE;

CREATE CONSTRAINT compliance_violation_natural_key_unique IF NOT EXISTS
FOR (v:ComplianceViolation)
REQUIRE v.naturalKey IS UNIQUE;

CREATE CONSTRAINT version_constraint_violation_natural_key_unique IF NOT EXISTS
FOR (v:VersionConstraintViolation)
REQUIRE v.naturalKey IS UNIQUE;

CREATE CONSTRAINT waiver_id_unique IF NOT EXISTS
FOR (w:Waiver)
REQUIRE w.id IS UNIQUE;

CREATE INDEX license_violation_status IF NOT EXISTS
FOR (v:LicenseViolation)
ON (v.status);

CREATE INDEX compliance_violation_status IF NOT EXISTS
FOR (v:ComplianceViolation)
ON (v.status);

CREATE INDEX version_constraint_violation_status IF NOT EXISTS
FOR (v:VersionConstraintViolation)
ON (v.status);

CREATE INDEX waiver_expires_at IF NOT EXISTS
FOR (w:Waiver)
ON (w.expiresAt);
