// Returns all TechnologyPolicy records for a given Technology (all statuses),
// ordered newest first.
MATCH (o:Organization {name: 'default'})-[:SETS]->(p:TechnologyPolicy)-[:GOVERNS]->(t:Technology {name: $technologyName})
RETURN p.id as id,
       p.time as time,
       p.rationale as rationale,
       p.migrationTarget as migrationTarget,
       p.status as status,
       toString(p.effectiveDate) as effectiveDate,
       toString(p.expiryDate) as expiryDate,
       p.createdBy as createdBy,
       p.createdByName as createdByName,
       toString(p.createdAt) as createdAt,
       toString(p.updatedAt) as updatedAt
ORDER BY p.createdAt DESC
