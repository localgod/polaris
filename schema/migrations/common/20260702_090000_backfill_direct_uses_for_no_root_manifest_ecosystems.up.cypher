// Migration: Backfill USES.isDirect for ecosystems with no root-manifest concept
//
// Some ecosystems (e.g. GitHub Actions) have no manifest file for cdxgen to
// build a dependency tree from — a workflow file references each action
// directly, with no dependsOn nesting. Components in these ecosystems were
// previously classified isDirect: false by default; they should always be
// treated as direct usages. Keep this list in sync with
// NO_ROOT_MANIFEST_ECOSYSTEMS in server/services/sbom.service.ts.

CALL {
  MATCH (s:System)-[u:USES]->(c:Component)
  WHERE coalesce(u.isDirect, false) = false
    AND c.packageManager IN ['github']
  SET u.isDirect = true,
      u.directInferredFrom = 'noRootManifestEcosystem',
      u.directInferredAt = datetime()
} IN TRANSACTIONS OF 1000 ROWS;
