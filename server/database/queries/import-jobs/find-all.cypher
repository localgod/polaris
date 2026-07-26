MATCH (job:ImportJob)
WHERE ($statuses IS NULL OR job.status IN $statuses)
  AND ($search IS NULL OR toLower(job.organization) CONTAINS toLower($search))
WITH job
ORDER BY job.createdAt DESC
WITH collect(job) AS jobs
RETURN size(jobs) AS total, jobs[$skip..$skip + $limit] AS jobs
