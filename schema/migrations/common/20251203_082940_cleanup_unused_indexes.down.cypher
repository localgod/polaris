/*
 * Migration Rollback: Cleanup Unused Indexes and Constraints
 * Version: 2025.12.03.082940
 * Author: @localgod
 * 
 * Description:
 * Restores all indexes and constraints removed by the cleanup migration.
 * Use this if you discover that any of the removed indexes were actually needed.
 *
 * Rollback: See 20251203_082940_cleanup_unused_indexes.up.cypher
 */

// ============================================================================
// TECHNOLOGY NODE RESTORATION
// ============================================================================

CREATE INDEX technology_owner_team IF NOT EXISTS
FOR (t:Technology)
ON (t.ownerTeam);

CREATE INDEX technology_risk_level IF NOT EXISTS
FOR (t:Technology)
ON (t.riskLevel);

// ============================================================================
// SYSTEM NODE RESTORATION
// ============================================================================

CREATE INDEX system_business_criticality IF NOT EXISTS
FOR (s:System)
ON (s.businessCriticality);

CREATE INDEX system_environment IF NOT EXISTS
FOR (s:System)
ON (s.environment);

// ============================================================================
// POLICY NODE RESTORATION
// ============================================================================

CREATE INDEX policy_enforced_by IF NOT EXISTS
FOR (p:Policy)
ON (p.enforcedBy);

CREATE INDEX policy_rule_type IF NOT EXISTS
FOR (p:Policy)
ON (p.ruleType);

// ============================================================================
// TEAM NODE RESTORATION
// ============================================================================

CREATE INDEX team_responsibility_area IF NOT EXISTS
FOR (t:Team)
ON (t.responsibilityArea);

// ============================================================================
// VERSION NODE RESTORATION
// ============================================================================

CREATE INDEX version_release_date IF NOT EXISTS
FOR (v:Version)
ON (v.releaseDate);

// ============================================================================
// COMPONENT NODE RESTORATION
// ============================================================================

CREATE INDEX component_supplier IF NOT EXISTS
FOR (c:Component)
ON (c.supplier);

CREATE INDEX component_published_date IF NOT EXISTS
FOR (c:Component)
ON (c.publishedDate);

// ============================================================================
// RELATIONSHIP INDEX RESTORATION
// ============================================================================

CREATE INDEX audit_performed_by IF NOT EXISTS
FOR ()-[r:PERFORMED_BY]-() 
ON (r.createdAt);

CREATE INDEX audit_audits IF NOT EXISTS
FOR ()-[r:AUDITS]-() 
ON (r.createdAt);

CREATE INDEX apitoken_belongs_to IF NOT EXISTS
FOR ()-[r:BELONGS_TO]-() 
ON (r.createdAt);

CREATE INDEX user_member_of IF NOT EXISTS
FOR ()-[r:MEMBER_OF]-() 
ON (r.joinedAt);

// ============================================================================
// APPROVES RELATIONSHIP RESTORATION
// ============================================================================

CREATE INDEX approves_status IF NOT EXISTS
FOR ()-[a:APPROVES]-()
ON (a.status);
