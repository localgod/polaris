/*
 * Rollback Migration: Simplify license rules
 * Version: 2026.02.20.153900
 *
 * Description:
 * Restores whitelisted property from allowed.
 * ALLOWS_LICENSE/DENIES_LICENSE relationships and licenseMode cannot be restored.
 */

// Rename allowed → whitelisted
MATCH (l:License)
WHERE l.allowed IS NOT NULL
SET l.whitelisted = l.allowed
REMOVE l.allowed;

// Restore index
CREATE INDEX license_whitelisted IF NOT EXISTS
FOR (l:License)
ON (l.whitelisted);

DROP INDEX license_allowed IF EXISTS;
