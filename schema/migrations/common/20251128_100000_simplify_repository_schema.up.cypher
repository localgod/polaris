/*
 * Migration: Simplify Repository Schema
 * Version: 2025.11.28.100000
 * 
 * Description:
 * Simplifies the Repository node schema by removing unused properties and indexes.
 * Adds lastSbomScanAt property for tracking SBOM submissions.
 * Removes unused properties from System nodes.
 *
 * Changes:
 * - Removes unused Repository properties: scmType, description, isPublic, requiresAuth, defaultBranch
 * - Removes unused Repository indexes: repository_scm_type, repository_is_public, repository_requires_auth
 * - Adds lastSbomScanAt property to Repository nodes
 * - Removes unused System properties: sourceCodeType, hasSourceAccess
 * - Removes unused System indexes: system_source_code_type, system_has_source_access
 *
 * Rationale:
 * - Repository model was overly complex for CI/CD SBOM submission use case
 * - Reduces from 9 properties to 5 essential properties
 * - Reduces from 5 indexes to 1 essential index (url uniqueness)
 * - Improves maintainability and clarity
 *
 * Dependencies:
 * - 20251029_080900_add_scm_repository_schema.up.cypher
 *
 * Rollback: See 20251128_100000_simplify_repository_schema.down.cypher
 */

// ============================================================================
// REMOVE UNUSED INDEXES
// ============================================================================

// Remove Repository indexes
DROP INDEX repository_scm_type IF EXISTS;
DROP INDEX repository_is_public IF EXISTS;
DROP INDEX repository_requires_auth IF EXISTS;

// Remove System indexes
DROP INDEX system_source_code_type IF EXISTS;
DROP INDEX system_has_source_access IF EXISTS;

// ============================================================================
// UPDATE REPOSITORY NODES
// ============================================================================

// Remove unused properties from Repository nodes
MATCH (r:Repository)
REMOVE r.scmType, r.description, r.isPublic, 
       r.requiresAuth, r.defaultBranch;

// Add new property for SBOM tracking
MATCH (r:Repository)
SET r.lastSbomScanAt = null;

// ============================================================================
// UPDATE SYSTEM NODES
// ============================================================================

// Remove unused properties from System nodes
MATCH (s:System)
REMOVE s.sourceCodeType, s.hasSourceAccess;
