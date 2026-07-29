/*
 * Rollback: Restore Policy Label
 *
 * Recreates the Policy constraint and indexes. Note: the `Policy` label
 * itself was already retired by `20260220_161500_rename_policy_to_version_constraint`
 * — this only restores the leftover schema surface, not the label's use.
 */

CREATE CONSTRAINT policy_name_unique IF NOT EXISTS
FOR (p:Policy) REQUIRE p.name IS UNIQUE;

CREATE INDEX policy_rule_type IF NOT EXISTS FOR (p:Policy) ON (p.ruleType);
CREATE INDEX policy_severity IF NOT EXISTS FOR (p:Policy) ON (p.severity);
CREATE INDEX policy_scope IF NOT EXISTS FOR (p:Policy) ON (p.scope);
CREATE INDEX policy_status IF NOT EXISTS FOR (p:Policy) ON (p.status);
CREATE INDEX policy_effective_date IF NOT EXISTS FOR (p:Policy) ON (p.effectiveDate);
CREATE INDEX policy_expiry_date IF NOT EXISTS FOR (p:Policy) ON (p.expiryDate);
