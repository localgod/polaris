/*
 * Rollback: Restore Component.scope Index
 *
 * Recreates the index. Note: Component.scope is no longer written by any
 * application code (scope now lives on the USES relationship), so this
 * index would remain empty even after restoring it.
 */

CREATE INDEX component_scope IF NOT EXISTS
FOR (c:Component)
ON (c.scope);
