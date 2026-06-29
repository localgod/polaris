MATCH (job:ImportJob {id: $id})
SET job.status = 'failed',
    job.finishedAt = datetime(),
    job.error = $error
