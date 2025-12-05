/*
 * Rollback Migration: create_license_entity_and_relationships
 * Version: 20251205.080214
 * 
 * This script rolls back the changes made in 20251205_080214_create_license_entity_and_relationships.up.cypher
 * 
 * Rollback Strategy:
 * 1. Remove HAS_LICENSE relationships
 * 2. Delete License nodes
 * 3. Remove migration metadata from Components
 * 4. Drop indexes and constraints
 * 
 * Note: Original Component.licenses arrays are preserved, so no data loss occurs
 */

// Step 1: Remove HAS_LICENSE relationships
MATCH ()-[r:HAS_LICENSE]->()
DELETE r;

// Step 2: Delete all License nodes
MATCH (l:License)
DELETE l;

// Step 3: Remove migration metadata from Components
MATCH (c:Component)
WHERE c._licenses_migrated IS NOT NULL
REMOVE c._licenses_migrated, c._licenses_migration_date;

// Step 4: Drop indexes
DROP INDEX license_osi_approved IF EXISTS;
DROP INDEX license_category IF EXISTS;
DROP INDEX license_spdx_id IF EXISTS;

// Step 5: Drop constraint
DROP CONSTRAINT license_id_unique IF EXISTS;
