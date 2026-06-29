MATCH (job:ImportJob {id: $jobId})
SET job.total = 0
