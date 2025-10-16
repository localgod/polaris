/*
 * Migration: Create Tech Catalog Schema
 * Version: 2025.10.16.100000
 * Author: @jsf
 * Ticket: CATALOG-001
 * 
 * Description:
 * Creates the foundational schema for the enterprise technology catalog.
 * This includes node types for Technology, Version, Component, System/Application,
 * Policy, and Team, along with their constraints and indexes.
 *
 * Node Types:
 * - Technology: Approved technologies in the enterprise catalog
 * - Version: Specific versions of technologies with approval status
 * - Component: SBOM entries (dependencies used in systems)
 * - System: Deployable units/services/applications
 * - Policy: Governance and compliance rules
 * - Team: Organizational ownership
 *
 * Dependencies:
 * - 2025-10-15_000000_init_migration_tracking.up.cypher
 *
 * Rollback: See 2025-10-16_100000_create_tech_catalog_schema.down.cypher
 */

// ============================================================================
// TECHNOLOGY NODE
// ============================================================================

// Unique constraint on technology name
CREATE CONSTRAINT technology_name_unique IF NOT EXISTS
FOR (t:Technology)
REQUIRE t.name IS UNIQUE;

// Index on category for filtering
CREATE INDEX technology_category IF NOT EXISTS
FOR (t:Technology)
ON (t.category);

// Index on status for filtering approved/deprecated technologies
CREATE INDEX technology_status IF NOT EXISTS
FOR (t:Technology)
ON (t.status);

// Index on ownerTeam for ownership queries
CREATE INDEX technology_owner_team IF NOT EXISTS
FOR (t:Technology)
ON (t.ownerTeam);

// Index on riskLevel for risk assessment queries
CREATE INDEX technology_risk_level IF NOT EXISTS
FOR (t:Technology)
ON (t.riskLevel);

// ============================================================================
// VERSION NODE
// ============================================================================

// Composite unique constraint on technology name and version
CREATE CONSTRAINT version_tech_version_unique IF NOT EXISTS
FOR (v:Version)
REQUIRE (v.technologyName, v.version) IS UNIQUE;

// Index on approved status for filtering
CREATE INDEX version_approved IF NOT EXISTS
FOR (v:Version)
ON (v.approved);

// Index on eolDate for EOL tracking
CREATE INDEX version_eol_date IF NOT EXISTS
FOR (v:Version)
ON (v.eolDate);

// Index on releaseDate for chronological queries
CREATE INDEX version_release_date IF NOT EXISTS
FOR (v:Version)
ON (v.releaseDate);

// ============================================================================
// COMPONENT NODE
// ============================================================================

// Composite unique constraint on name, version, and packageManager
CREATE CONSTRAINT component_name_version_pm_unique IF NOT EXISTS
FOR (c:Component)
REQUIRE (c.name, c.version, c.packageManager) IS UNIQUE;

// Index on packageManager for filtering by ecosystem
CREATE INDEX component_package_manager IF NOT EXISTS
FOR (c:Component)
ON (c.packageManager);

// Index on license for compliance queries
CREATE INDEX component_license IF NOT EXISTS
FOR (c:Component)
ON (c.license);

// Index on hash for integrity verification
CREATE INDEX component_hash IF NOT EXISTS
FOR (c:Component)
ON (c.hash);

// ============================================================================
// SYSTEM NODE
// ============================================================================

// Unique constraint on system name
CREATE CONSTRAINT system_name_unique IF NOT EXISTS
FOR (s:System)
REQUIRE s.name IS UNIQUE;

// Index on domain for domain-based queries
CREATE INDEX system_domain IF NOT EXISTS
FOR (s:System)
ON (s.domain);

// Index on ownerTeam for ownership queries
CREATE INDEX system_owner_team IF NOT EXISTS
FOR (s:System)
ON (s.ownerTeam);

// Index on businessCriticality for risk assessment
CREATE INDEX system_business_criticality IF NOT EXISTS
FOR (s:System)
ON (s.businessCriticality);

// Index on environment for environment-based filtering
CREATE INDEX system_environment IF NOT EXISTS
FOR (s:System)
ON (s.environment);

// ============================================================================
// POLICY NODE
// ============================================================================

// Unique constraint on policy name
CREATE CONSTRAINT policy_name_unique IF NOT EXISTS
FOR (p:Policy)
REQUIRE p.name IS UNIQUE;

// Index on ruleType for filtering by policy type
CREATE INDEX policy_rule_type IF NOT EXISTS
FOR (p:Policy)
ON (p.ruleType);

// Index on severity for prioritization
CREATE INDEX policy_severity IF NOT EXISTS
FOR (p:Policy)
ON (p.severity);

// ============================================================================
// TEAM NODE
// ============================================================================

// Unique constraint on team name
CREATE CONSTRAINT team_name_unique IF NOT EXISTS
FOR (t:Team)
REQUIRE t.name IS UNIQUE;

// Index on email for contact queries
CREATE INDEX team_email IF NOT EXISTS
FOR (t:Team)
ON (t.email);

// Index on responsibilityArea for organizational queries
CREATE INDEX team_responsibility_area IF NOT EXISTS
FOR (t:Team)
ON (t.responsibilityArea);
