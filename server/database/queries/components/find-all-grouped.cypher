// Phase 1: filter candidate components, reduce them to group identities,
// compute group-level aggregates across all versions, then paginate groups.
MATCH (candidate:Component)
{{COMPONENT_WHERE}}
WITH DISTINCT
     coalesce(candidate.packageManager, 'unknown') as packageManagerKey,
     coalesce(candidate.group, '') as groupKey,
     candidate.name as name
MATCH (groupComponent:Component { name: name })
WHERE coalesce(groupComponent.packageManager, 'unknown') = packageManagerKey
  AND coalesce(groupComponent.group, '') = groupKey
{{GROUP_COMPONENT_WHERE}}
OPTIONAL MATCH (groupSystem:System)-[:USES]->(groupComponent)
WITH packageManagerKey,
     groupKey,
     name,
     collect(DISTINCT groupComponent) as groupComponents,
     count(DISTINCT groupSystem) as groupSystemCount,
     [type IN collect(DISTINCT groupComponent.type) WHERE type IS NOT NULL | type] as groupTypes,
     min(groupComponent.type) as primaryType
WITH collect({
       packageManagerKey: packageManagerKey,
       groupKey: groupKey,
       name: name,
       components: groupComponents,
       systemCount: groupSystemCount,
       types: groupTypes,
       primaryType: primaryType
     }) as allGroups,
     count(*) as total
UNWIND allGroups as group
WITH group, total
ORDER BY {{ORDER_BY}}
{{PAGINATION}}

// Phase 2: fetch related version-level data only for the paginated groups.
UNWIND group.components as c
OPTIONAL MATCH (versionSystem:System)-[u:USES]->(c)
WITH group, total, c,
     count(DISTINCT versionSystem) as versionSystemCount,
     head([x IN collect(DISTINCT {scope: u.scope, isDirect: u.isDirect, sysName: versionSystem.name}) WHERE x.sysName = $system | x.scope]) as scope,
     head([x IN collect(DISTINCT {scope: u.scope, isDirect: u.isDirect, sysName: versionSystem.name}) WHERE x.sysName = $system | x.isDirect]) as isDirect
OPTIONAL MATCH (c)-[:HAS_LICENSE]->(l:License)
WITH group, total, c, versionSystemCount, scope, isDirect,
     collect(DISTINCT {id: l.id, name: l.name, url: l.url, text: l.text}) as licenses
OPTIONAL MATCH (c)-[:HAS_REFERENCE]->(ref:ExternalReference)
WITH group, total, c, versionSystemCount, scope, isDirect, licenses,
     collect(DISTINCT {type: ref.type, url: ref.url}) as externalReferences
OPTIONAL MATCH (c)-[:IS_VERSION_OF]->(tech:Technology)
WITH group, total,
     collect({
       name: c.name,
       version: c.version,
       packageManager: c.packageManager,
       purl: c.purl,
       cpe: c.cpe,
       bomRef: c.bomRef,
       type: c.type,
       group: c.group,
       scope: scope,
       isDirect: isDirect,
       licenses: [lic IN licenses WHERE lic.id IS NOT NULL OR lic.name IS NOT NULL | lic],
       homepage: c.homepage,
       externalReferences: [er IN externalReferences WHERE er.type IS NOT NULL | er],
       description: c.description,
       releaseDate: c.releaseDate,
       publishedDate: c.publishedDate,
       modifiedDate: c.modifiedDate,
       technologyName: tech.name,
       systemCount: versionSystemCount
     }) as versionDetails
RETURN group.name as name,
       CASE group.groupKey WHEN '' THEN null ELSE group.groupKey END as `group`,
       group.packageManagerKey as packageManager,
       group.systemCount as systemCount,
       group.types as types,
       group.primaryType as primaryType,
       versionDetails,
       total
ORDER BY {{ORDER_BY}}
