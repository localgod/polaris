MATCH (job:ImportJob {id: $id})
OPTIONAL MATCH (job)-[:HAS_ITEM]->(item:ImportJobItem)
DETACH DELETE job, item
