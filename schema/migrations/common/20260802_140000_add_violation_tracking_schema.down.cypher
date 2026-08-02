/*
 * Rollback: Add violation tracking schema
 */

DROP INDEX waiver_expires_at IF EXISTS;
DROP INDEX version_constraint_violation_status IF EXISTS;
DROP INDEX compliance_violation_status IF EXISTS;
DROP INDEX license_violation_status IF EXISTS;

DROP CONSTRAINT waiver_id_unique IF EXISTS;
DROP CONSTRAINT version_constraint_violation_natural_key_unique IF EXISTS;
DROP CONSTRAINT compliance_violation_natural_key_unique IF EXISTS;
DROP CONSTRAINT license_violation_natural_key_unique IF EXISTS;

MATCH (w:Waiver)
DETACH DELETE w;

MATCH (v:VersionConstraintViolation)
DETACH DELETE v;

MATCH (v:ComplianceViolation)
DETACH DELETE v;

MATCH (v:LicenseViolation)
DETACH DELETE v;
