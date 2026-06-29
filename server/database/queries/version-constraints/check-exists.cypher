MATCH (vc:VersionConstraint {name: $name})
RETURN vc.name AS name
LIMIT 1
