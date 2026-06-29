CREATE (vc:VersionConstraint {
  name: $name,
  description: $description,
  severity: $severity,
  scope: $scope,
  subjectTeam: $subjectTeam,
  versionRange: $versionRange,
  status: $status,
  createdBy: $userId,
  createdAt: datetime(),
  updatedAt: datetime()
})
WITH vc
CREATE (a:AuditLog {
  id: randomUUID(),
  timestamp: datetime(),
  operation: 'CREATE',
  entityType: 'VersionConstraint',
  entityId: vc.name,
  entityLabel: vc.name,
  changedFields: ['name', 'severity', 'scope', 'status', 'versionRange'],
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
})
CREATE (a)-[:AUDITS]->(vc)
