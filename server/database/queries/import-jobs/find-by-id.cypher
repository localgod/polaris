MATCH (job:ImportJob {id: $id})
OPTIONAL MATCH (job)-[:HAS_ITEM]->(item:ImportJobItem)
WITH job, item
ORDER BY item.repositoryFullName ASC
RETURN job, collect(item) AS items
