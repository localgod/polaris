// First, verify all licenses exist
UNWIND $licenseIds as licenseId
MATCH (l:License {id: licenseId})
WITH collect(l) as licenses, $licenseIds as requestedIds
// This WHERE clause ensures atomicity: if any license doesn't exist,
// the sizes won't match and the query returns no results (rollback)
WHERE size(licenses) = size(requestedIds)

// If all exist, update them
UNWIND licenses as license
WITH license, license.allowed as previousAllowed
SET license.allowed = $allowed,
    license.updatedAt = datetime()
RETURN collect({id: license.id, name: license.name, previousAllowed: previousAllowed}) as updatedLicenses,
       count(license) as updated
