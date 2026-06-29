MATCH (job:ImportJob {id: $id})
SET job.status = 'running',
    job.startedAt = coalesce(job.startedAt, datetime()),
    job.error = null
