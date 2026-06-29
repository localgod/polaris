MATCH (job:ImportJob {id: $jobId})-[:HAS_ITEM]->(item:ImportJobItem {repositoryFullName: $repositoryFullName})
SET item.status = $status,
    item.message = $message,
    item.systemName = $systemName,
    item.manifestsFound = $manifestsFound,
    item.componentsAdded = $componentsAdded,
    item.componentsUpdated = $componentsUpdated,
    item.relationshipsCreated = $relationshipsCreated,
    item.finishedAt = datetime()
SET job.completed = job.completed + 1,
    job.failed = job.failed + CASE WHEN $status = 'failed' THEN 1 ELSE 0 END,
    job.skipped = job.skipped + CASE WHEN $status = 'skipped' THEN 1 ELSE 0 END
