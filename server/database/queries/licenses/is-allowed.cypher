MATCH (l:License {id: $id})
RETURN l.allowed as allowed
