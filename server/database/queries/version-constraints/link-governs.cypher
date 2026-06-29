MATCH (vc:VersionConstraint {name: $name})
MATCH (tech:Technology {name: $technology})
MERGE (vc)-[:GOVERNS]->(tech)
RETURN count(*) AS count
