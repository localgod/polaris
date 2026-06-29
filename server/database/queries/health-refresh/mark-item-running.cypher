MATCH (:HealthRefreshJob {id: $jobId})-[:HAS_ITEM]->(item:HealthRefreshJobItem {id: $itemId})
SET item.status = 'running',
    item.startedAt = coalesce(item.startedAt, datetime()),
    item.errorSummary = null
