MATCH (vc:VersionConstraint {name: $name})
DETACH DELETE vc
