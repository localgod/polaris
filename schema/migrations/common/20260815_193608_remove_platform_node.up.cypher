/*
 * Migration: remove_platform_node
 * Version: 20260815.193608
 *
 * Description:
 * Removes the Platform node type entirely, per ADR-0007 (supersedes the
 * Platform exception introduced in ADR-0004). Platform was a manually-declared,
 * evidence-free sibling to Technology for non-SBOM-observable infrastructure.
 * Polaris now governs only what SBOM evidence shows; infrastructure governance
 * is out of scope, not deferred.
 *
 * This is a plain delete: unlike the componentless-Technology cutover
 * (20260702_180000), no AuditLog entries are written for the deleted nodes —
 * Platform was never evidence-backed, so there is no governance history here
 * worth preserving the way there was for that migration's converted Technologies.
 *
 * Dependencies:
 * - 20260702_150000_create_platform_node (creates the constraint dropped below)
 *
 * Rollback: See 20260815_193608_remove_platform_node.down.cypher
 */

MATCH (p:Platform)
DETACH DELETE p;

DROP CONSTRAINT platform_name_unique IF EXISTS;
