/*
 * Migration: add_policy_license_mode
 * Version: 20260122.143000
 * Author: Ona
 * 
 * Description:
 * Adds licenseMode property to Policy nodes and creates index for DENIES_LICENSE
 * relationship. This enables both allowlist and denylist approaches for license
 * compliance policies.
 *
 * Changes:
 * 1. Add licenseMode property to existing license-compliance policies (default: 'allowlist')
 * 2. Create index for DENIES_LICENSE relationship lookup
 *
 * License Modes:
 * - 'allowlist': Violation if license is NOT in ALLOWS_LICENSE relationships
 * - 'denylist': Violation if license IS in DENIES_LICENSE relationships
 */

// Step 1: Add licenseMode property to existing license-compliance policies
// Default to 'allowlist' for backward compatibility
MATCH (p:Policy)
WHERE p.ruleType = 'license-compliance' AND p.licenseMode IS NULL
SET p.licenseMode = 'allowlist';

// Step 2: Create index for Policy name (for faster lookups)
CREATE INDEX policy_name IF NOT EXISTS
FOR (p:Policy)
ON (p.name);

// Step 3: Create index for Policy ruleType (for filtering)
CREATE INDEX policy_rule_type IF NOT EXISTS
FOR (p:Policy)
ON (p.ruleType);

// Step 4: Create index for Policy status (for active policy queries)
CREATE INDEX policy_status IF NOT EXISTS
FOR (p:Policy)
ON (p.status);
