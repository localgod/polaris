/*
 * Rollback Migration: add_component_search_indexes
 * Version: 20251201.084431
 * 
 * This script rolls back the changes made in 20251201_084431_add_component_search_indexes.up.cypher
 * Drops all indexes created for component search and filtering.
 */

// Drop composite index
DROP INDEX component_search_composite_index IF EXISTS;

// Drop type index
DROP INDEX component_type_index IF EXISTS;

// Drop package manager index
DROP INDEX component_package_manager_index IF EXISTS;

// Drop name index
DROP INDEX component_name_index IF EXISTS;
