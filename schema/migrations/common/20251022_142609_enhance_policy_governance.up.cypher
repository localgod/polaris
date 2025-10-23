/*
 * Migration: Enhance Policy Governance
 * Version: 2025.10.22.142609
 * Author: Ona
 * 
 * Description:
 * Enhances Policy node for sophisticated governance with team relationships.
 * 
 * Changes:
 * 1. Add new properties to Policy nodes:
 *    - effectiveDate: When policy becomes active
 *    - expiryDate: When policy expires (null = no expiry)
 *    - enforcedBy: Team responsible for enforcement
 *    - scope: Policy scope (organization, domain, team)
 *    - status: Policy status (active, draft, archived)
 * 
 * 2. Add new relationships:
 *    - Team -[:ENFORCES]-> Policy (who enforces the policy)
 *    - Team -[:SUBJECT_TO]-> Policy (who must comply)
 *    - Policy -[:GOVERNS]-> Technology (replaces APPLIES_TO)
 *    - Policy -[:GOVERNS]-> Version (version-specific policies)
 * 
 * 3. Create indexes for performance
 * 
 * Rollback: See 20251022_142609_enhance_policy_governance.down.cypher
 */

// Add new properties to existing Policy nodes
MATCH (p:Policy)
SET p.effectiveDate = COALESCE(p.effectiveDate, date()),
    p.expiryDate = COALESCE(p.expiryDate, null),
    p.enforcedBy = COALESCE(p.enforcedBy, 'Security'),
    p.scope = COALESCE(p.scope, 'organization'),
    p.status = COALESCE(p.status, 'active');

// Create indexes for new properties
CREATE INDEX policy_effective_date IF NOT EXISTS
FOR (p:Policy)
ON (p.effectiveDate);

CREATE INDEX policy_expiry_date IF NOT EXISTS
FOR (p:Policy)
ON (p.expiryDate);

CREATE INDEX policy_enforced_by IF NOT EXISTS
FOR (p:Policy)
ON (p.enforcedBy);

CREATE INDEX policy_scope IF NOT EXISTS
FOR (p:Policy)
ON (p.scope);

CREATE INDEX policy_status IF NOT EXISTS
FOR (p:Policy)
ON (p.status);

// Rename APPLIES_TO to GOVERNS for clearer semantics
MATCH (p:Policy)-[r:APPLIES_TO]->(tech:Technology)
CREATE (p)-[g:GOVERNS]->(tech)
DELETE r;

// Create ENFORCES relationships based on enforcedBy property
MATCH (p:Policy)
MATCH (team:Team {name: p.enforcedBy})
MERGE (team)-[:ENFORCES]->(p);

// Create SUBJECT_TO relationships (all teams subject to organization-wide policies)
MATCH (p:Policy {scope: 'organization'})
MATCH (team:Team)
MERGE (team)-[:SUBJECT_TO]->(p);
