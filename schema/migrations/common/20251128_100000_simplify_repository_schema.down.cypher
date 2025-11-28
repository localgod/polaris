/*
 * Migration Rollback: Simplify Repository Schema
 * Version: 2025.11.28.100000
 * 
 * Description:
 * Restores the original Repository and System schema by recreating
 * indexes and properties that were removed.
 *
 * WARNING:
 * - Property values cannot be restored (they were removed)
 * - Properties will be set to null for all nodes
 * - Manual data restoration may be required
 */

// ============================================================================
// RESTORE INDEXES
// ============================================================================

// Restore Repository indexes
CREATE INDEX repository_scm_type IF NOT EXISTS
FOR (r:Repository)
ON (r.scmType);

CREATE INDEX repository_is_public IF NOT EXISTS
FOR (r:Repository)
ON (r.isPublic);

CREATE INDEX repository_requires_auth IF NOT EXISTS
FOR (r:Repository)
ON (r.requiresAuth);

// Restore System indexes
CREATE INDEX system_source_code_type IF NOT EXISTS
FOR (s:System)
ON (s.sourceCodeType);

CREATE INDEX system_has_source_access IF NOT EXISTS
FOR (s:System)
ON (s.hasSourceAccess);

// ============================================================================
// RESTORE REPOSITORY PROPERTIES
// ============================================================================

// Add back removed properties (values will be null)
MATCH (r:Repository)
SET r.scmType = null,
    r.description = null,
    r.isPublic = null,
    r.requiresAuth = null,
    r.defaultBranch = null;

// Remove lastSbomScanAt property
MATCH (r:Repository)
REMOVE r.lastSbomScanAt;

// ============================================================================
// RESTORE SYSTEM PROPERTIES
// ============================================================================

// Add back removed properties (values will be null)
MATCH (s:System)
SET s.sourceCodeType = null,
    s.hasSourceAccess = null;
