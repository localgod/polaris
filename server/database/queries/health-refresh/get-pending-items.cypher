MATCH (:HealthRefreshJob {id: $jobId})-[:HAS_ITEM]->(item:HealthRefreshJobItem {status: 'pending'})
RETURN item
ORDER BY item.componentName ASC, item.componentVersion ASC
LIMIT toInteger($limit)
