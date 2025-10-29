/*
 * Rollback Migration: Add SCM Repository Schema
 * Version: 2025.10.29.080900
 * 
 * Description:
 * Removes the SCM repository schema additions.
 *
 * Changes:
 * - Drops Repository node constraints and indexes
 * - Drops System property indexes
 * - Removes sourceCodeType and hasSourceAccess properties from System nodes
 * - Deletes all Repository nodes and their relationships
 */

// ============================================================================
// DROP SYSTEM INDEXES
// ============================================================================

DROP INDEX system_source_code_type IF EXISTS;
DROP INDEX system_has_source_access IF EXISTS;

// ============================================================================
// DROP REPOSITORY INDEXES AND CONSTRAINTS
// ============================================================================

DROP INDEX repository_scm_type IF EXISTS;
DROP INDEX repository_is_public IF EXISTS;
DROP INDEX repository_requires_auth IF EXISTS;
DROP CONSTRAINT repository_url_unique IF EXISTS;

// ============================================================================
// REMOVE PROPERTIES FROM SYSTEM NODES
// ============================================================================

MATCH (s:System)
WHERE s.sourceCodeType IS NOT NULL OR s.hasSourceAccess IS NOT NULL
REMOVE s.sourceCodeType, s.hasSourceAccess;

// ============================================================================
// DELETE REPOSITORY NODES AND RELATIONSHIPS
// ============================================================================

MATCH (r:Repository)
DETACH DELETE r;
