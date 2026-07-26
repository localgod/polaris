MATCH (:HealthRefreshJob {id: $jobId})-[:HAS_ITEM]->(item:HealthRefreshJobItem)
WHERE item.status IN ['pending', 'running']
SET item.status = 'skipped',
    item.finishedAt = coalesce(item.finishedAt, datetime())
