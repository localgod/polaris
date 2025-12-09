/*
 * Migration Rollback: add_license_whitelist_property
 * Version: 20251205.120000
 * 
 * Description:
 * Removes whitelisted property and related indexes from License nodes.
 * This rollback restores the License entity to its previous state.
 *
 * Rollback Strategy:
 * 1. Drop whitelist index
 * 2. Remove whitelisted property from all License nodes
 * 3. Remove migration metadata properties
 * 4. Update timestamps to reflect rollback
 */

// Step 1: Drop the whitelist index
DROP INDEX license_whitelisted IF EXISTS;

// Step 2: Remove whitelisted property from all License nodes
MATCH (l:License)
WHERE l.whitelisted IS NOT NULL
REMOVE l.whitelisted;

// Step 3: Remove migration metadata
MATCH (l:License)
WHERE l._whitelist_migration_date IS NOT NULL
REMOVE l._whitelist_migration_date, l._whitelist_migration_version;

// Step 4: Update timestamps to reflect rollback
MATCH (l:License)
SET l.updatedAt = datetime();