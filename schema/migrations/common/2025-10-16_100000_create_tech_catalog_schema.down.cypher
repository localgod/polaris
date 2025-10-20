/*
 * Rollback Migration: Create Tech Catalog Schema
 * Version: 2025.10.16.100000
 * 
 * This script rolls back the changes made in 2025-10-16_100000_create_tech_catalog_schema.up.cypher
 * 
 * WARNING: This will remove all tech catalog constraints and indexes.
 * Data nodes will remain but will lose their schema enforcement.
 * Only use this in development or if you need to completely reset the catalog schema.
 */

// ============================================================================
// TEAM NODE - Drop in reverse order
// ============================================================================

DROP INDEX team_responsibility_area IF EXISTS;
DROP INDEX team_email IF EXISTS;
DROP CONSTRAINT team_name_unique IF EXISTS;

// ============================================================================
// POLICY NODE
// ============================================================================

DROP INDEX policy_severity IF EXISTS;
DROP INDEX policy_rule_type IF EXISTS;
DROP CONSTRAINT policy_name_unique IF EXISTS;

// ============================================================================
// SYSTEM NODE
// ============================================================================

DROP INDEX system_environment IF EXISTS;
DROP INDEX system_business_criticality IF EXISTS;
DROP INDEX system_owner_team IF EXISTS;
DROP INDEX system_domain IF EXISTS;
DROP CONSTRAINT system_name_unique IF EXISTS;

// ============================================================================
// COMPONENT NODE
// ============================================================================

DROP INDEX component_hash IF EXISTS;
DROP INDEX component_license IF EXISTS;
DROP INDEX component_package_manager IF EXISTS;
DROP CONSTRAINT component_name_version_pm_unique IF EXISTS;

// ============================================================================
// VERSION NODE
// ============================================================================

DROP INDEX version_release_date IF EXISTS;
DROP INDEX version_eol_date IF EXISTS;
DROP INDEX version_approved IF EXISTS;
DROP CONSTRAINT version_tech_version_unique IF EXISTS;

// ============================================================================
// TECHNOLOGY NODE
// ============================================================================

DROP INDEX technology_risk_level IF EXISTS;
DROP INDEX technology_owner_team IF EXISTS;
DROP INDEX technology_status IF EXISTS;
DROP INDEX technology_category IF EXISTS;
DROP CONSTRAINT technology_name_unique IF EXISTS;

// ============================================================================
// OPTIONAL: Remove all catalog nodes (commented out for safety)
// ============================================================================
// MATCH (t:Technology) DETACH DELETE t;
// MATCH (v:Version) DETACH DELETE v;
// MATCH (c:Component) DETACH DELETE c;
// MATCH (s:System) DETACH DELETE s;
// MATCH (p:Policy) DETACH DELETE p;
// MATCH (t:Team) DETACH DELETE t;
