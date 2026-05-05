// Rollback: Restore name+version+packageManager as the Component MERGE key
//
// Re-creates the composite uniqueness constraint dropped by the up migration.
// Note: if duplicate {name, version, packageManager} nodes were created after
// the up migration ran, this rollback will fail until those duplicates are
// resolved manually.

CREATE CONSTRAINT component_name_version_pm_unique IF NOT EXISTS
FOR (c:Component)
REQUIRE (c.name, c.version, c.packageManager) IS UNIQUE;
