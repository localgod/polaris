MATCH (c:Component)-[:HAS_LICENSE]->(l:License {id: $licenseId})
RETURN count(DISTINCT c) as total
