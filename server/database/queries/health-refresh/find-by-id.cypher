MATCH (job:HealthRefreshJob {id: $id})
OPTIONAL MATCH (job)-[:HAS_ITEM]->(item:HealthRefreshJobItem)
WITH job, item
ORDER BY item.componentName ASC, item.componentVersion ASC
RETURN job, collect(item) AS items
