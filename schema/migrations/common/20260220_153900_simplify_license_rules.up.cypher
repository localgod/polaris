/*
 * Migration: Simplify license rules
 * Version: 2026.02.20.153900
 *
 * Description:
 * Replaces the policy-based license compliance model with a simple
 * allowed/disallowed property on License nodes.
 *
 * 1. Rename whitelisted → allowed on License nodes
 * 2. Drop ALLOWS_LICENSE and DENIES_LICENSE relationships
 * 3. Remove licenseMode property from Policy nodes
 * 4. Drop license-compliance policies (they are replaced by the allowed property)
 */

// Step 1: Rename whitelisted → allowed
MATCH (l:License)
WHERE l.whitelisted IS NOT NULL
SET l.allowed = l.whitelisted
REMOVE l.whitelisted;

// Step 2: Default allowed to true for any License missing the property
MATCH (l:License)
WHERE l.allowed IS NULL
SET l.allowed = true;

// Step 3: Drop ALLOWS_LICENSE relationships
MATCH ()-[r:ALLOWS_LICENSE]->()
DELETE r;

// Step 4: Drop DENIES_LICENSE relationships
MATCH ()-[r:DENIES_LICENSE]->()
DELETE r;

// Step 5: Remove licenseMode from Policy nodes
MATCH (p:Policy)
WHERE p.licenseMode IS NOT NULL
REMOVE p.licenseMode;

// Step 6: Create index on allowed property
CREATE INDEX license_allowed IF NOT EXISTS
FOR (l:License)
ON (l.allowed);

// Step 7: Drop old whitelisted index
DROP INDEX license_whitelisted IF EXISTS;
