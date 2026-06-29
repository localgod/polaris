MATCH (job:ImportJob {id: $jobId})
SET job.total = size($items)
WITH job
UNWIND $items AS item
CREATE (job)-[:HAS_ITEM]->(:ImportJobItem {
  id: randomUUID(),
  repositoryFullName: item.repositoryFullName,
  repositoryUrl: item.repositoryUrl,
  ownerTeam: item.ownerTeam,
  status: coalesce(item.status, 'pending'),
  message: item.message,
  systemName: item.systemName,
  manifestsFound: coalesce(item.manifestsFound, 0),
  componentsAdded: coalesce(item.componentsAdded, 0),
  componentsUpdated: coalesce(item.componentsUpdated, 0),
  relationshipsCreated: coalesce(item.relationshipsCreated, 0),
  startedAt: null,
  finishedAt: CASE WHEN coalesce(item.status, 'pending') <> 'pending' THEN datetime() ELSE null END
})
