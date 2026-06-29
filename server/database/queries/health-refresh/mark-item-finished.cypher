MATCH (job:HealthRefreshJob {id: $jobId})-[:HAS_ITEM]->(item:HealthRefreshJobItem {id: $itemId})
SET item.status = $status,
    item.failedSources = $failedSources,
    item.failedFields = $failedFields,
    item.errorSummary = $errorSummary,
    item.finishedAt = datetime()
SET job.completedItems = job.completedItems + 1,
    job.failedItems = job.failedItems + CASE WHEN $status = 'failed' THEN 1 ELSE 0 END
