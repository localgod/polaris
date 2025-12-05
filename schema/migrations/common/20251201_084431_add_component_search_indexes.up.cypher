/*
 * Migration: add_component_search_indexes
 * Version: 20251201.084431
 * Author: @vscode
 * Ticket: N/A
 * 
 * Description:
 * Adds indexes to improve performance of component queries with filtering.
 * These indexes support the new filtering and search functionality on the
 * components page, which can handle 10,000+ components efficiently.
 *
 * Indexes created:
 * - component_name_index: For name-based searches
 * - component_package_manager_index: For package manager filtering
 * - component_type_index: For component type filtering
 * - component_search_composite_index: For combined name + packageManager queries
 *
 * Dependencies:
 * - Requires Component nodes to exist (from initial schema)
 *
 * Rollback: See 20251201_084431_add_component_search_indexes.down.cypher
 */

// Index for component name (used in search)
CREATE INDEX component_name_index IF NOT EXISTS
FOR (c:Component) ON (c.name);

// Index for package manager (used in filtering)
CREATE INDEX component_package_manager_index IF NOT EXISTS
FOR (c:Component) ON (c.packageManager);

// Index for component type (used in filtering)
CREATE INDEX component_type_index IF NOT EXISTS
FOR (c:Component) ON (c.type);

// Composite index for common search patterns (name + packageManager)
CREATE INDEX component_search_composite_index IF NOT EXISTS
FOR (c:Component) ON (c.name, c.packageManager);
