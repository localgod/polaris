MATCH (root:Component)
WHERE (
  $purl IS NOT NULL
  AND root.purl = $purl
) OR (
  $purl IS NULL
  AND root.name = $name
  AND root.version = $version
  AND coalesce(root.packageManager, '') = coalesce($packageManager, '')
  AND coalesce(root.`group`, '') = coalesce($group, '')
)
OPTIONAL MATCH (systemContext:System {name: $system})
WITH root, systemContext

// Collect system components once — avoids repeated EXISTS { MATCH } per path node
OPTIONAL MATCH (systemContext)-[sysUse:USES]->(usedComp:Component)
WITH root, systemContext,
     collect(usedComp) AS systemComponents,
     collect({comp: usedComp, scope: sysUse.scope}) AS systemUses

CALL {
  WITH root, systemContext, systemComponents, systemUses
  MATCH path = (root)-[:DEPENDS_ON*1..{{MAX_DEPTH}}]->(:Component)
  WHERE (
    $system IS NULL OR (
      systemContext IS NOT NULL
      AND root IN systemComponents
      AND all(pathNode IN nodes(path)[1..] WHERE pathNode IN systemComponents)
    )
  )
  AND (
    size($scopes) = 0 OR all(pathNode IN nodes(path)[1..] WHERE
      any(su IN systemUses WHERE su.comp = pathNode AND su.scope IN $scopes)
    )
  )
  WITH path, systemUses
  ORDER BY length(path)
  LIMIT toInteger($pathLimit)
  RETURN collect({
    nodes: [pathNode IN nodes(path)[1..] | {
      elementId: elementId(pathNode),
      name: pathNode.name,
      group: pathNode.`group`,
      version: pathNode.version,
      packageManager: pathNode.packageManager,
      purl: pathNode.purl,
      scope: CASE
        WHEN $system IS NULL THEN null
        ELSE head([su IN systemUses WHERE su.comp = pathNode | su.scope])
      END
    }]
  }) as paths,
  count(path) as pathCount
}
RETURN {
  elementId: elementId(root),
  name: root.name,
  group: root.`group`,
  version: root.version,
  packageManager: root.packageManager,
  purl: root.purl
} as root,
($system IS NULL OR systemContext IS NOT NULL) as systemExists,
paths,
pathCount
