/*
 * Migration: Remove unused Repository properties
 * Version: 20260218.131500
 *
 * Removes scmType, isPublic, and requiresAuth properties and their indexes
 * from Repository nodes. These were added in 20251029_080900 but never
 * used by any query, service, or UI component.
 */

// Drop indexes
DROP INDEX repository_scm_type IF EXISTS;
DROP INDEX repository_is_public IF EXISTS;
DROP INDEX repository_requires_auth IF EXISTS;

// Remove properties from any Repository nodes that have them
MATCH (r:Repository)
WHERE r.scmType IS NOT NULL OR r.isPublic IS NOT NULL OR r.requiresAuth IS NOT NULL
SET r.scmType = null, r.isPublic = null, r.requiresAuth = null;
