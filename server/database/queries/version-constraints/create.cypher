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
