MATCH (job:HealthRefreshJob {status: 'queued'})
WITH job
ORDER BY job.createdAt ASC
LIMIT 1
SET job.status = 'running',
    job.startedAt = coalesce(job.startedAt, datetime()),
    job.error = null
RETURN job.id AS id
