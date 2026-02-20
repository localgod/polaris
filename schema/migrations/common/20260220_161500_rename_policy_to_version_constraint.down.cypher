// Reverse: VersionConstraint → Policy
// Note: dropped properties and ENFORCES relationships cannot be restored.

// Relabel VersionConstraint → Policy
MATCH (vc:VersionConstraint)
SET vc:Policy, vc.ruleType = 'version-constraint'
REMOVE vc:VersionConstraint;

// Restore audit log entity type
MATCH (a:AuditLog)
WHERE a.entityType = 'VersionConstraint'
SET a.entityType = 'Policy';
