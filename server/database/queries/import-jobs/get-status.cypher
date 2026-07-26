MATCH (job:ImportJob {id: $id})
RETURN job.status AS status
