/*
 * Rollback: Recreate indexes for scmType, isPublic, requiresAuth on Repository.
 * Property values cannot be restored.
 */

CREATE INDEX repository_scm_type IF NOT EXISTS
FOR (r:Repository)
ON (r.scmType);

CREATE INDEX repository_is_public IF NOT EXISTS
FOR (r:Repository)
ON (r.isPublic);

CREATE INDEX repository_requires_auth IF NOT EXISTS
FOR (r:Repository)
ON (r.requiresAuth);
