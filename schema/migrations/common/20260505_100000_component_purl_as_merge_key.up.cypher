// Migration: Use purl as the primary MERGE key for Component nodes
//
// Previously, Component nodes were merged on {name, version, packageManager}.
// This key is not unique for scoped npm packages: CycloneDX strips the @scope/
// prefix from the name field, so @types/linkify-it@5.0.0 and linkify-it@5.0.0
// both produce name='linkify-it'. They collided into a single node, corrupting
// bomRef and breaking DEPENDS_ON edge resolution for the displaced package.
//
// The fix: purl is the canonical unique identifier. The component_purl_unique
// constraint already exists; this migration drops the name+version+pm constraint
// and backfills purl on any legacy nodes that lack it.

// Step 1: Backfill purl on legacy Component nodes that were created before purl
//         was stored. Uses name@version as a stable fallback key so the
//         component_purl_unique constraint can be satisfied.
MATCH (c:Component)
WHERE c.purl IS NULL
SET c.purl = c.name + '@' + COALESCE(c.version, 'unknown');

// Step 2: Drop the name+version+packageManager uniqueness constraint. It is
//         superseded by component_purl_unique and causes false collisions for
//         scoped npm packages.
DROP CONSTRAINT component_name_version_pm_unique IF EXISTS;
