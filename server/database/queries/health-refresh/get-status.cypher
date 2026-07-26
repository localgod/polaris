MATCH (job:HealthRefreshJob {id: $id})
RETURN job.status AS status
