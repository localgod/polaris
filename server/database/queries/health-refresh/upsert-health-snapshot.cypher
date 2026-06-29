MATCH (c:Component {purl: $componentPurl})
MERGE (h:HealthSnapshot {componentPurl: $componentPurl})
ON CREATE SET h.createdAt = datetime()
SET h.componentName = $componentName
MERGE (c)-[:HAS_HEALTH_SNAPSHOT]->(h)
{{SNAPSHOT_SET}}
{{ADVISORY_QUERY}}
RETURN h.componentPurl AS componentPurl
