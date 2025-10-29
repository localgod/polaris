/*
 * Migration: Add SCM Repository Schema
 * Version: 2025.10.29.080900
 * 
 * Description:
 * Adds support for associating Systems with Source Code Management (SCM) repositories.
 * This enables tracking of proprietary vs open-source systems, multiple repositories
 * per system, and different SCM types (Git, SVN, etc.).
 *
 * Changes:
 * - Creates Repository node type with constraints and indexes
 * - Adds sourceCodeType and hasSourceAccess properties to System nodes
 * - Creates indexes for new System properties
 *
 * Node Types:
 * - Repository: Represents a source code repository
 *
 * Relationships (to be created via application logic):
 * - (System)-[:HAS_SOURCE_IN]->(Repository)
 * - (Team)-[:MAINTAINS]->(Repository)
 *
 * Dependencies:
 * - 2025-10-16_100000_create_tech_catalog_schema.up.cypher
 *
 * Rollback: See 20251029_080900_add_scm_repository_schema.down.cypher
 */

// ============================================================================
// REPOSITORY NODE
// ============================================================================

// Unique constraint on repository URL
CREATE CONSTRAINT repository_url_unique IF NOT EXISTS
FOR (r:Repository)
REQUIRE r.url IS UNIQUE;

// Index on scmType for filtering by SCM system
CREATE INDEX repository_scm_type IF NOT EXISTS
FOR (r:Repository)
ON (r.scmType);

// Index on isPublic for access control queries
CREATE INDEX repository_is_public IF NOT EXISTS
FOR (r:Repository)
ON (r.isPublic);

// Index on requiresAuth for credential management
CREATE INDEX repository_requires_auth IF NOT EXISTS
FOR (r:Repository)
ON (r.requiresAuth);

// ============================================================================
// SYSTEM NODE UPDATES
// ============================================================================

// Index on sourceCodeType for filtering systems by source code accessibility
CREATE INDEX system_source_code_type IF NOT EXISTS
FOR (s:System)
ON (s.sourceCodeType);

// Index on hasSourceAccess for finding systems with accessible source
CREATE INDEX system_has_source_access IF NOT EXISTS
FOR (s:System)
ON (s.hasSourceAccess);
