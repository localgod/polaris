/*
 * Migration: Enhance Component Schema for SBOM Support
 * Version: 2025.11.02.180000
 * Author: Ona
 * 
 * Description:
 * Enhances the Component node schema to fully support SPDX and CycloneDX SBOM formats.
 * Adds universal identifiers (purl, cpe), component classification, enhanced hash support,
 * supplier information, and temporal metadata.
 *
 * Changes:
 * - Add purl (Package URL) for universal identification
 * - Add cpe (Common Platform Enumeration) for vulnerability matching
 * - Add bomRef for cross-referencing within SBOMs
 * - Add type and group for component classification
 * - Add scope for dependency classification
 * - Add copyright, description, supplier, author, publisher
 * - Add homepage and temporal metadata
 * - Remove single hash field in favor of structured hashes
 * - Remove single license field in favor of structured licenses
 * - Remove importPath (Polaris-specific, not in SBOM standards)
 *
 * Dependencies:
 * - 2025-10-16_100000_create_tech_catalog_schema.up.cypher
 *
 * Rollback: See 20251102_180000_enhance_component_for_sbom.down.cypher
 */

// ============================================================================
// DROP OLD CONSTRAINTS AND INDEXES
// ============================================================================

// Drop old composite constraint (will be replaced with purl-based constraint)
DROP CONSTRAINT component_name_version_pm_unique IF EXISTS;

// Drop old indexes that will be replaced
DROP INDEX component_package_manager IF EXISTS;
DROP INDEX component_license IF EXISTS;
DROP INDEX component_hash IF EXISTS;

// ============================================================================
// CREATE NEW CONSTRAINTS
// ============================================================================

// Primary constraint: purl is the universal identifier
CREATE CONSTRAINT component_purl_unique IF NOT EXISTS
FOR (c:Component)
REQUIRE c.purl IS UNIQUE;

// Fallback constraint for components without purl (legacy/internal)
// Composite: name + version + packageManager
CREATE CONSTRAINT component_name_version_pm_unique IF NOT EXISTS
FOR (c:Component)
REQUIRE (c.name, c.version, c.packageManager) IS UNIQUE;

// ============================================================================
// CREATE NEW INDEXES
// ============================================================================

// Universal identifiers
CREATE INDEX component_cpe IF NOT EXISTS
FOR (c:Component)
ON (c.cpe);

CREATE INDEX component_bom_ref IF NOT EXISTS
FOR (c:Component)
ON (c.bomRef);

// Classification
CREATE INDEX component_type IF NOT EXISTS
FOR (c:Component)
ON (c.type);

CREATE INDEX component_group IF NOT EXISTS
FOR (c:Component)
ON (c.group);

CREATE INDEX component_package_manager IF NOT EXISTS
FOR (c:Component)
ON (c.packageManager);

// Dependency scope
CREATE INDEX component_scope IF NOT EXISTS
FOR (c:Component)
ON (c.scope);

// Supplier information
CREATE INDEX component_supplier IF NOT EXISTS
FOR (c:Component)
ON (c.supplier);

// Temporal queries
CREATE INDEX component_release_date IF NOT EXISTS
FOR (c:Component)
ON (c.releaseDate);

CREATE INDEX component_published_date IF NOT EXISTS
FOR (c:Component)
ON (c.publishedDate);

// ============================================================================
// HASH NODE TYPE
// ============================================================================

// Create Hash node type for multiple hashes per component
CREATE CONSTRAINT hash_component_algorithm_unique IF NOT EXISTS
FOR (h:Hash)
REQUIRE (h.componentPurl, h.algorithm) IS UNIQUE;

CREATE INDEX hash_algorithm IF NOT EXISTS
FOR (h:Hash)
ON (h.algorithm);

CREATE INDEX hash_value IF NOT EXISTS
FOR (h:Hash)
ON (h.value);

// ============================================================================
// LICENSE NODE TYPE
// ============================================================================

// Create License node type for multiple licenses per component
CREATE CONSTRAINT license_id_unique IF NOT EXISTS
FOR (l:License)
REQUIRE l.id IS UNIQUE;

CREATE INDEX license_name IF NOT EXISTS
FOR (l:License)
ON (l.name);

// ============================================================================
// EXTERNAL REFERENCE NODE TYPE
// ============================================================================

// Create ExternalReference node type for component references
CREATE INDEX external_reference_type IF NOT EXISTS
FOR (e:ExternalReference)
ON (e.type);

CREATE INDEX external_reference_url IF NOT EXISTS
FOR (e:ExternalReference)
ON (e.url);

// ============================================================================
// VULNERABILITY NODE TYPE
// ============================================================================

// Create Vulnerability node type
CREATE CONSTRAINT vulnerability_id_unique IF NOT EXISTS
FOR (v:Vulnerability)
REQUIRE v.id IS UNIQUE;

CREATE INDEX vulnerability_severity IF NOT EXISTS
FOR (v:Vulnerability)
ON (v.severity);

CREATE INDEX vulnerability_cvss_score IF NOT EXISTS
FOR (v:Vulnerability)
ON (v.cvssScore);

CREATE INDEX vulnerability_published_date IF NOT EXISTS
FOR (v:Vulnerability)
ON (v.publishedDate);

// ============================================================================
// MIGRATION TRACKING
// ============================================================================

CREATE (m:Migration {
  version: '20251102_180000',
  name: 'enhance_component_for_sbom',
  appliedAt: datetime(),
  description: 'Enhanced Component schema for full SBOM support (SPDX and CycloneDX)'
});
