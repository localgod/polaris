/*
 * Migration: add_license_whitelist_property
 * Version: 20251205.120000
 * Author: GitHub Copilot
 * Ticket: Superadmin License Whitelist Management
 * 
 * Description:
 * Adds whitelisted property to License nodes to support superadmin-controlled
 * global license whitelist management. This enables:
 * - Superadmin can mark any discovered license as globally approved
 * - License whitelist status used in compliance reporting
 * - Efficient querying of whitelisted vs non-whitelisted licenses
 * - Integration with existing policy-based license compliance
 *
 * Migration Strategy:
 * 1. Add whitelisted property to all existing License nodes (default: false)
 * 2. Create index for efficient whitelist status queries
 * 3. Update timestamps to reflect property addition
 *
 * Dependencies:
 * - Requires License nodes created by 20251205_080214_create_license_entity_and_relationships
 *
 * Rollback: See 20251205_120000_add_license_whitelist_property.down.cypher
 */

// Step 1: Add whitelisted property to all existing License nodes
// Default to false - no licenses are whitelisted by default
MATCH (l:License)
WHERE l.whitelisted IS NULL
SET l.whitelisted = false,
    l.updatedAt = datetime();

// Step 2: Create index for efficient whitelist queries
// This enables fast filtering by whitelist status in admin UI
CREATE INDEX license_whitelisted IF NOT EXISTS
FOR (l:License)
ON (l.whitelisted);

// Step 3: Add metadata to track this migration
// Helps with debugging and rollback verification
MATCH (l:License)
WHERE l._whitelist_migration_date IS NULL
SET l._whitelist_migration_date = datetime(),
    l._whitelist_migration_version = '20251205.120000';