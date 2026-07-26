MATCH (job:HealthRefreshJob {id: $id})
WHERE job.status IN ['queued', 'running']
SET job.status = 'cancelled',
    job.finishedAt = datetime(),
    job.error = 'Cancelled by admin'
