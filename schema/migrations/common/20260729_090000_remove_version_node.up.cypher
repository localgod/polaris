/*
 * Migration: Remove Version Node
 * Version: 2026.07.29.090000
 * Author: @ona
 *
 * Description:
 * Removes the Version node type and its constraint/indexes, and retires
 * the version-level-approval-priority capability. No code path has ever
 * created a Version node or a HAS_VERSION relationship in production —
 * Component became the SBOM-observed unit of version tracking (see
 * 20251102_180000_enhance_component_for_sbom) and the 135 Version nodes
 * in this environment were 100% orphaned (zero relationships of any
 * kind). This was previously a tested contract (team.repository.spec.ts
 * checkApproval() prioritizing version-level over technology-level
 * approval); confirmed with the product owner that this capability is
 * being retired, not just cleaned up as dead code, so the corresponding
 * test was updated in the same change that introduces this migration.
 *
 * Dependencies:
 * - None
 *
 * Rollback: See corresponding .down.cypher file
 */

// Drop indexes for Version node
DROP INDEX version_approved IF EXISTS;
DROP INDEX version_eol_date IF EXISTS;

// Drop constraint for Version node (also backs the version_tech_version_unique index)
DROP CONSTRAINT version_tech_version_unique IF EXISTS;

// Delete all Version nodes (all are orphaned; DETACH DELETE is a safety net
// in case any relationship was ever added out-of-band)
MATCH (v:Version)
DETACH DELETE v;
