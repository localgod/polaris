/*
 * Migration Rollback: Enhance Component Schema for SBOM Support
 * Version: 2025.11.02.180000
 * 
 * Description:
 * Rolls back the Component schema enhancements for SBOM support.
 * Restores original constraints and indexes.
 */

// ============================================================================
// DROP NEW CONSTRAINTS
// ============================================================================

DROP CONSTRAINT component_purl_unique IF EXISTS;
DROP CONSTRAINT hash_component_algorithm_unique IF EXISTS;
DROP CONSTRAINT license_id_unique IF EXISTS;
DROP CONSTRAINT vulnerability_id_unique IF EXISTS;

// ============================================================================
// DROP NEW INDEXES
// ============================================================================

// Component indexes
DROP INDEX component_cpe IF EXISTS;
DROP INDEX component_bom_ref IF EXISTS;
DROP INDEX component_type IF EXISTS;
DROP INDEX component_group IF EXISTS;
DROP INDEX component_scope IF EXISTS;
DROP INDEX component_supplier IF EXISTS;
DROP INDEX component_release_date IF EXISTS;
DROP INDEX component_published_date IF EXISTS;

// Hash indexes
DROP INDEX hash_algorithm IF EXISTS;
DROP INDEX hash_value IF EXISTS;

// License indexes
DROP INDEX license_name IF EXISTS;

// ExternalReference indexes
DROP INDEX external_reference_type IF EXISTS;
DROP INDEX external_reference_url IF EXISTS;

// Vulnerability indexes
DROP INDEX vulnerability_severity IF EXISTS;
DROP INDEX vulnerability_cvss_score IF EXISTS;
DROP INDEX vulnerability_published_date IF EXISTS;

// ============================================================================
// RESTORE ORIGINAL CONSTRAINTS AND INDEXES
// ============================================================================

// Restore original composite constraint
CREATE CONSTRAINT component_name_version_pm_unique IF NOT EXISTS
FOR (c:Component)
REQUIRE (c.name, c.version, c.packageManager) IS UNIQUE;

// Restore original indexes
CREATE INDEX component_package_manager IF NOT EXISTS
FOR (c:Component)
ON (c.packageManager);

CREATE INDEX component_license IF NOT EXISTS
FOR (c:Component)
ON (c.license);

CREATE INDEX component_hash IF NOT EXISTS
FOR (c:Component)
ON (c.hash);

// ============================================================================
// DELETE MIGRATION TRACKING
// ============================================================================

MATCH (m:Migration {version: '20251102_180000'})
DELETE m;
