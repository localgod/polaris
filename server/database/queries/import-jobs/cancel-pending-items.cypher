MATCH (job:ImportJob {id: $jobId})-[:HAS_ITEM]->(item:ImportJobItem)
WHERE item.status IN ['pending', 'running']
WITH job, collect(item) AS pendingItems
FOREACH (item IN pendingItems |
  SET item.status = 'skipped',
      item.message = 'Cancelled',
      item.finishedAt = coalesce(item.finishedAt, datetime())
)
SET job.skipped = job.skipped + size(pendingItems)
