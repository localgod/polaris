// Phase 1: filter on component properties, then join and apply join filters
MATCH (c:Component)
{{COMPONENT_WHERE}}
OPTIONAL MATCH (c)-[:IS_VERSION_OF]->(tech:Technology)
{{LICENSE_MATCH}}
{{JOIN_WHERE}}
{{PRE_AGGREGATION}}
WITH collect({c: c, tech: tech{{PRE_AGG_COLLECT}}}) as allRows, count(c) as total
UNWIND allRows as row
WITH row.c as c, row.tech as tech, total{{PRE_AGG_UNWIND}}
ORDER BY {{PRE_ORDER_BY}}
{{PAGINATION}}
// Phase 2: fetch related data only for the paginated subset
OPTIONAL MATCH (sys:System)-[:USES]->(c)
OPTIONAL MATCH (c)-[:HAS_HASH]->(h:Hash)
OPTIONAL MATCH (c)-[:HAS_LICENSE]->(l:License)
OPTIONAL MATCH (c)-[:HAS_REFERENCE]->(ref:ExternalReference)
WITH c, tech, total,
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
       c.group as `group`,
       c.scope as scope,
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
       systemCount,
       total
ORDER BY {{ORDER_BY}}
