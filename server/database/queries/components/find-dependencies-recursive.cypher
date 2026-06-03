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
CALL {
  WITH root, systemContext
  MATCH path = (root)-[:DEPENDS_ON*1..{{MAX_DEPTH}}]->(:Component)
  WHERE (
    $system IS NULL OR (
      systemContext IS NOT NULL
      AND EXISTS { MATCH (systemContext)-[:USES]->(root) }
      AND all(pathNode IN nodes(path)[1..] WHERE EXISTS { MATCH (systemContext)-[:USES]->(pathNode) })
    )
  )
  AND (
    size($scopes) = 0 OR all(pathNode IN nodes(path)[1..] WHERE EXISTS {
      MATCH (systemContext)-[scopeUse:USES]->(pathNode)
      WHERE scopeUse.scope IN $scopes
    })
  )
  WITH path
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
        ELSE head([(systemContext)-[nodeUse:USES]->(pathNode) | nodeUse.scope])
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
