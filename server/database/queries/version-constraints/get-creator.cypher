MATCH (vc:VersionConstraint {name: $name})
RETURN vc.createdBy AS createdBy
