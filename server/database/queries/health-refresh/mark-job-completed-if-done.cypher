MATCH (job:HealthRefreshJob {id: $jobId})
OPTIONAL MATCH (job)-[:HAS_ITEM]->(item:HealthRefreshJobItem)
WITH job,
     count(item) AS itemCount,
     sum(CASE WHEN item.status IN ['pending', 'running'] THEN 1 ELSE 0 END) AS unfinished
WHERE unfinished = 0
SET job.status = 'completed',
    job.finishedAt = datetime(),
    job.completedItems = itemCount
