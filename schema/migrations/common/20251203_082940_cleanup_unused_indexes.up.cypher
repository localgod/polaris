/*
 * Migration: Cleanup Unused Indexes and Constraints
 * Version: 2025.12.03.082940
 * Author: @localgod
 * 
 * Description:
 * Removes unused indexes and constraints that provide no query benefit and add
 * unnecessary write overhead. This migration focuses on conservative cleanup of
 * clearly unused schema elements while preserving all actively queried properties.
 *
 * Categories of cleanup:
 * 1. Duplicate property-based indexes replaced by relationships
 * 2. Properties that are never queried independently
 * 3. Redundant relationship indexes with low selectivity
 * 4. Over-indexed temporal fields
 *
 * Impact: Reduces write overhead on Component, Policy, Team, and relationship operations
 * while maintaining all necessary query performance.
 *
 * Dependencies:
 * - All previous migrations through 20251201_071900
 *
 * Rollback: See 20251203_082940_cleanup_unused_indexes.down.cypher
 */

// ============================================================================
// TECHNOLOGY NODE CLEANUP
// ============================================================================

// Remove ownerTeam index - replaced by STEWARDED_BY relationship
// Migration 20251022_141517 renamed OWNS to STEWARDED_BY but didn't clean up
DROP INDEX technology_owner_team IF EXISTS;

// Remove riskLevel index - never queried, risk assessment via policies
DROP INDEX technology_risk_level IF EXISTS;

// ============================================================================
// SYSTEM NODE CLEANUP
// ============================================================================

// Remove businessCriticality index - property exists but never filtered in queries
DROP INDEX system_business_criticality IF EXISTS;

// Remove environment index - property exists but never filtered in queries
DROP INDEX system_environment IF EXISTS;

// ============================================================================
// POLICY NODE CLEANUP
// ============================================================================

// Remove enforcedBy property index - replaced by (Team)-[:ENFORCES]->(Policy) relationship
// Migration 20251022_142609 created ENFORCES relationship but kept property index
// Property is still used for display but not for filtering
DROP INDEX policy_enforced_by IF EXISTS;

// Remove ruleType index - property exists but never filtered independently
// Policies are typically filtered by scope/status, not ruleType alone
DROP INDEX policy_rule_type IF EXISTS;

// ============================================================================
// TEAM NODE CLEANUP
// ============================================================================

// Remove responsibilityArea index - property defined in schema but never populated or queried
DROP INDEX team_responsibility_area IF EXISTS;

// Keep team_email as it's occasionally used for lookups

// ============================================================================
// VERSION NODE CLEANUP
// ============================================================================

// Remove releaseDate index - less important than eolDate for queries
// Most queries focus on EOL tracking, not release chronology
DROP INDEX version_release_date IF EXISTS;

// ============================================================================
// COMPONENT NODE CLEANUP (SBOM)
// ============================================================================

// Remove supplier index - property exists for SBOM data but rarely queried independently
// Supplier information is typically accessed as part of component details, not filtered
DROP INDEX component_supplier IF EXISTS;

// Remove publishedDate index - property exists but never queried
// releaseDate already provides temporal context where needed
DROP INDEX component_published_date IF EXISTS;

// Keep component_group - actively used in queries (verified in cypher files)
// Keep component_type - standard SBOM classification
// Keep component_package_manager - critical for ecosystem filtering

// ============================================================================
// RELATIONSHIP INDEX CLEANUP
// ============================================================================

// Remove relationship indexes that provide minimal benefit
// Neo4j relationship traversal is already highly optimized
// These indexes add write overhead without meaningful query improvement

// Remove PERFORMED_BY relationship index
// AuditLog.userId already indexed; relationship traversal is sufficiently fast
DROP INDEX audit_performed_by IF EXISTS;

// Remove AUDITS relationship index
// Entity-specific queries covered by audit_log_entity_composite index
DROP INDEX audit_audits IF EXISTS;

// Remove BELONGS_TO relationship index
// ApiToken.tokenHash lookup is the primary access pattern, not user->tokens
DROP INDEX apitoken_belongs_to IF EXISTS;

// Remove MEMBER_OF relationship index
// Team membership queries are infrequent and small result sets
DROP INDEX user_member_of IF EXISTS;

// ============================================================================
// APPROVES RELATIONSHIP CLEANUP
// ============================================================================

// Verify old status index is gone (should have been removed by TIME migration)
// Migration 20251022_101947 renamed status->time but may have left old index
DROP INDEX approves_status IF EXISTS;

// Keep approves_time, approves_eol_date, approves_approved_at - actively used

// ============================================================================
// SUMMARY OF REMOVALS
// ============================================================================
// Technology: 2 indexes (owner_team, risk_level)
// System: 2 indexes (business_criticality, environment)
// Policy: 2 indexes (enforced_by, rule_type)
// Team: 1 index (responsibility_area)
// Version: 1 index (release_date)
// Component: 2 indexes (supplier, published_date)
// Relationships: 4 indexes (audit_performed_by, audit_audits, apitoken_belongs_to, user_member_of)
// Total: 14 indexes removed
//
// This reduces write overhead while maintaining all query performance
// for actively used access patterns.
