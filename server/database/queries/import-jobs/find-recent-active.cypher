MATCH (job:ImportJob)
WHERE job.status IN ['running', 'queued']
   OR (job.status = 'failed' AND job.createdAt >= datetime() - duration({hours: $sinceHours}))
WITH job
ORDER BY job.createdAt DESC
RETURN count(job) AS total, collect(job)[0..$limit] AS jobs
