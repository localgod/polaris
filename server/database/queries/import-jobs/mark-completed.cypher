MATCH (job:ImportJob {id: $id})
SET job.status = 'completed',
    job.finishedAt = datetime()
