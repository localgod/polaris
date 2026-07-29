/*
 * Migration: Remove Policy Label
 * Version: 2026.07.29.091500
 * Author: @ona
 *
 * Description:
 * Removes the vestigial `Policy` label's constraint and indexes.
 * `20260220_161500_rename_policy_to_version_constraint` relabeled every
 * Policy node to VersionConstraint over a year ago (`SET p:VersionConstraint
 * REMOVE p:Policy`), so `Policy` has had zero live nodes since — but its
 * unique constraint and 6 property indexes were never dropped. No
 * application code references the `Policy` label any more.
 *
 * Dependencies:
 * - 20260220_161500_rename_policy_to_version_constraint
 *
 * Rollback: See corresponding .down.cypher file
 */

DROP INDEX policy_effective_date IF EXISTS;
DROP INDEX policy_expiry_date IF EXISTS;
DROP INDEX policy_rule_type IF EXISTS;
DROP INDEX policy_scope IF EXISTS;
DROP INDEX policy_severity IF EXISTS;
DROP INDEX policy_status IF EXISTS;
DROP CONSTRAINT policy_name_unique IF EXISTS;
