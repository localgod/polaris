MATCH (t:Team {name: $name})
SET t.name = $newName,
    t.email = $email,
    t.responsibilityArea = $responsibilityArea
RETURN t.name as name
