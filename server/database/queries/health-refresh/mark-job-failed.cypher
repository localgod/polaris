MATCH (job:HealthRefreshJob {id: $jobId})
SET job.status = 'failed',
    job.finishedAt = datetime(),
    job.error = $error
