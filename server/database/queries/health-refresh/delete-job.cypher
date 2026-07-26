MATCH (job:HealthRefreshJob {id: $id})
OPTIONAL MATCH (job)-[:HAS_ITEM]->(item:HealthRefreshJobItem)
DETACH DELETE job, item
