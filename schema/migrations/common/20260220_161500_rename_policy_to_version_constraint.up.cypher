// Rename Policy nodes to VersionConstraint and simplify the model.
//
// 1. Add :VersionConstraint label, remove :Policy label
// 2. Drop unused properties: ruleType, effectiveDate, expiryDate, enforcedBy
// 3. Drop ENFORCES relationships (no enforcement logic uses them)

// Step 1: Relabel Policy → VersionConstraint
MATCH (p:Policy)
SET p:VersionConstraint
REMOVE p:Policy;

// Step 2: Drop unused properties
MATCH (vc:VersionConstraint)
REMOVE vc.ruleType, vc.effectiveDate, vc.expiryDate, vc.enforcedBy;

// Step 3: Drop ENFORCES relationships
MATCH ()-[r:ENFORCES]->(:VersionConstraint)
DELETE r;

// Step 4: Drop old audit log references to Policy (update entityType)
MATCH (a:AuditLog)
WHERE a.entityType = 'Policy'
SET a.entityType = 'VersionConstraint';
