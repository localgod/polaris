MATCH (c:Component)
WHERE (
  $purl IS NOT NULL
  AND c.purl = $purl
) OR (
  $purl IS NULL
  AND c.name = $name
  AND c.version = $version
  AND coalesce(c.packageManager, '') = coalesce($packageManager, '')
  AND coalesce(c.`group`, '') = coalesce($group, '')
)
OPTIONAL MATCH (c)-[:IS_VERSION_OF]->(tech:Technology)
OPTIONAL MATCH (sys:System)-[u:USES]->(c)
OPTIONAL MATCH (c)-[:HAS_HASH]->(h:Hash)
OPTIONAL MATCH (c)-[:HAS_LICENSE]->(l:License)
OPTIONAL MATCH (c)-[:HAS_REFERENCE]->(ref:ExternalReference)
WITH c, tech,
     collect(DISTINCT {name: sys.name, scope: u.scope, isDirect: u.isDirect}) as systems,
     collect(DISTINCT {algorithm: h.algorithm, value: h.value}) as hashes,
     collect(DISTINCT {id: l.id, name: l.name, url: l.url, text: l.text}) as licenses,
     collect(DISTINCT {type: ref.type, url: ref.url}) as externalReferences
RETURN c.name as name,
       c.version as version,
       c.packageManager as packageManager,
       c.purl as purl,
       c.cpe as cpe,
       c.bomRef as bomRef,
       c.type as type,
       c.group as `group`,
       null as scope,
       null as isDirect,
       [hash IN hashes WHERE hash.algorithm IS NOT NULL | hash] as hashes,
       [lic IN licenses WHERE lic.id IS NOT NULL | lic] as licenses,
       c.copyright as copyright,
       c.supplier as supplier,
       c.author as author,
       c.publisher as publisher,
       c.description as description,
       c.homepage as homepage,
       [er IN externalReferences WHERE er.type IS NOT NULL | er] as externalReferences,
       c.releaseDate as releaseDate,
       c.publishedDate as publishedDate,
       c.modifiedDate as modifiedDate,
       tech.name as technologyName,
       size([system IN systems WHERE system.name IS NOT NULL | system]) as systemCount,
       [system IN systems WHERE system.name IS NOT NULL | system] as systems
LIMIT 1
