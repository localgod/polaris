MATCH (l:License {id: $id})
WITH l, l.allowed as previousAllowed
SET l.allowed = $allowed,
    l.updatedAt = datetime()
RETURN count(l) as updated, l.name as name, previousAllowed
