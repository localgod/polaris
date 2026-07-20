CREATE (job:HealthRefreshJob {
  id: randomUUID(),
  status: 'queued',
  trigger: $trigger,
  systemName: $systemName,
  totalItems: 0,
  completedItems: 0,
  failedItems: 0,
  createdAt: datetime(),
  startedAt: null,
  finishedAt: null,
  error: null,
  correlationId: $correlationId
})
WITH job
CALL {
  WITH job
  MATCH (c:Component)
  WHERE c.purl IS NOT NULL
    AND (
      $systemName IS NULL
      OR EXISTS {
        MATCH (:System {name: $systemName})-[:USES]->(c)
      }
    )
  WITH DISTINCT job, c
  CREATE (job)-[:HAS_ITEM]->(:HealthRefreshJobItem {
    id: randomUUID(),
    componentPurl: c.purl,
    componentName: c.name,
    componentVersion: c.version,
    packageManager: c.packageManager,
    status: 'pending',
    failedSources: [],
    failedFields: [],
    errorSummary: null,
    startedAt: null,
    finishedAt: null
  })
  RETURN count(c) AS totalItems
}
SET job.totalItems = totalItems
RETURN job.id AS id
