// First, verify all licenses exist
UNWIND $licenseIds as licenseId
MATCH (l:License {id: licenseId})
WITH collect(l) as licenses, $licenseIds as requestedIds
// This WHERE clause ensures atomicity: if any license doesn't exist,
// the sizes won't match and the query returns no results (rollback)
WHERE size(licenses) = size(requestedIds)

// If all exist, update them and create audit logs
UNWIND licenses as license
WITH license, license.allowed as previousAllowed
SET license.allowed = $allowed,
    license.updatedAt = datetime()
WITH license, {
  operation: CASE $allowed WHEN true THEN 'ENABLE' ELSE 'DISABLE' END,
  entityType: 'License',
  entityId: license.id,
  entityLabel: license.name,
  previousStatus: CASE previousAllowed WHEN true THEN 'enabled' ELSE 'disabled' END,
  newStatus: CASE $allowed WHEN true THEN 'enabled' ELSE 'disabled' END,
  changedFields: ['allowed'],
  source: 'API',
  userId: $userId,
  realUserId: $realUserId
} AS auditFields
{{AUDIT_LOG_WRITE}}
CREATE (a)-[:AUDITS]->(license)
RETURN count(license) as updated
