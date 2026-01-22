/*
 * Migration Rollback: add_policy_license_mode
 * Version: 20260122.143000
 * 
 * Removes licenseMode property and related indexes
 */

// Remove licenseMode property from policies
MATCH (p:Policy)
WHERE p.licenseMode IS NOT NULL
REMOVE p.licenseMode;

// Remove DENIES_LICENSE relationships
MATCH ()-[r:DENIES_LICENSE]->()
DELETE r;

// Drop indexes (if they exist)
DROP INDEX policy_name IF EXISTS;
DROP INDEX policy_rule_type IF EXISTS;
DROP INDEX policy_status IF EXISTS;
