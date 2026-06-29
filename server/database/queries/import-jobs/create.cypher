CREATE (job:ImportJob {
  id: randomUUID(),
  type: $type,
  status: 'queued',
  requestedBy: $requestedBy,
  organization: $organization,
  filters: $filters,
  dryRun: $dryRun,
  total: 0,
  completed: 0,
  failed: 0,
  skipped: 0,
  createdAt: datetime(),
  startedAt: null,
  finishedAt: null,
  error: null
})
WITH job
OPTIONAL MATCH (user:User {id: $requestedBy})
FOREACH (_ IN CASE WHEN user IS NULL THEN [] ELSE [1] END |
  MERGE (user)-[:REQUESTED]->(job)
)
RETURN job, [] AS items
