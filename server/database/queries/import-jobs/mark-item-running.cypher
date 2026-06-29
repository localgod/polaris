MATCH (:ImportJob {id: $jobId})-[:HAS_ITEM]->(item:ImportJobItem {repositoryFullName: $repositoryFullName})
SET item.status = 'running',
    item.startedAt = coalesce(item.startedAt, datetime()),
    item.message = null
