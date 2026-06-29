WITH c, h
OPTIONAL MATCH (c)-[oldAdvisory:HAS_ADVISORY]->(:Advisory)
DELETE oldAdvisory
WITH c, h
UNWIND $advisories AS advisory
MERGE (a:Advisory {id: advisory.id})
SET a.aliases = advisory.aliases,
    a.summary = advisory.summary,
    a.cvssVector = advisory.cvssVector,
    a.cvssScore = advisory.cvssScore,
    a.advisoryUrl = advisory.advisoryUrl,
    a.publishedAt = CASE WHEN advisory.publishedAt IS NULL THEN null ELSE datetime(advisory.publishedAt) END,
    a.modifiedAt = CASE WHEN advisory.modifiedAt IS NULL THEN null ELSE datetime(advisory.modifiedAt) END,
    a.source = advisory.source
MERGE (c)-[r:HAS_ADVISORY]->(a)
SET r.observedAt = datetime()
WITH h
