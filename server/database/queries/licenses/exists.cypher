MATCH (l:License {id: $id})
RETURN count(l) > 0 as exists
