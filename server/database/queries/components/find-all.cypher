MATCH (c:Component)
OPTIONAL MATCH (c)-[:IS_VERSION_OF]->(tech:Technology)
OPTIONAL MATCH (sys:System)-[:USES]->(c)
OPTIONAL MATCH (c)-[:HAS_HASH]->(h:Hash)
OPTIONAL MATCH (c)-[:HAS_LICENSE]->(l:License)
OPTIONAL MATCH (c)-[:HAS_REFERENCE]->(ref:ExternalReference)
WITH c, tech,
     count(DISTINCT sys) as systemCount,
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
       c.group as group,
       c.scope as scope,
       hashes,
       licenses,
       c.copyright as copyright,
       c.supplier as supplier,
       c.author as author,
       c.publisher as publisher,
       c.description as description,
       c.homepage as homepage,
       externalReferences,
       c.releaseDate as releaseDate,
       c.publishedDate as publishedDate,
       c.modifiedDate as modifiedDate,
       tech.name as technologyName,
       systemCount
ORDER BY c.packageManager, c.name
