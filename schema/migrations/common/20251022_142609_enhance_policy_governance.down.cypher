/*
 * Rollback Migration: Enhance Policy Governance
 * Version: 2025.10.22.142609
 * Author: Ona
 * 
 * Description:
 * Rollback for Policy governance enhancements
 *
 * Rollback Steps:
 * 1. Remove SUBJECT_TO and ENFORCES relationships
 * 2. Rename GOVERNS back to APPLIES_TO
 * 3. Drop indexes
 * 4. Remove new properties from Policy nodes
 */

// Remove SUBJECT_TO relationships
MATCH (:Team)-[r:SUBJECT_TO]->(:Policy)
DELETE r;

// Remove ENFORCES relationships
MATCH (:Team)-[r:ENFORCES]->(:Policy)
DELETE r;

// Rename GOVERNS back to APPLIES_TO
MATCH (p:Policy)-[g:GOVERNS]->(tech:Technology)
CREATE (p)-[r:APPLIES_TO]->(tech)
DELETE g;

// Drop indexes
DROP INDEX policy_effective_date IF EXISTS;
DROP INDEX policy_expiry_date IF EXISTS;
DROP INDEX policy_enforced_by IF EXISTS;
DROP INDEX policy_scope IF EXISTS;
DROP INDEX policy_status IF EXISTS;

// Remove new properties from Policy nodes
MATCH (p:Policy)
REMOVE p.effectiveDate, p.expiryDate, p.enforcedBy, p.scope, p.status;
