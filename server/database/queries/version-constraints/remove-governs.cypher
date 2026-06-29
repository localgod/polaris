MATCH (vc:VersionConstraint {name: $name})-[r:GOVERNS]->(:Technology)
DELETE r
