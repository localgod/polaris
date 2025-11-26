// Find the system
MATCH (s:System {name: $systemName})

// Process each component
UNWIND $components AS comp

// Create unique identifier (prefer purl, fallback to name@version)
WITH s, comp,
     COALESCE(comp.purl, comp.name + '@' + COALESCE(comp.version, 'unknown')) AS componentId

// MERGE component by unique identifier
MERGE (c:Component {purl: componentId})
ON CREATE SET
  c.name = comp.name,
  c.createdAt = $timestamp
ON MATCH SET
  c.updatedAt = $timestamp

// Create System-Component relationship
MERGE (s)-[r:USES]->(c)
ON CREATE SET r.addedAt = $timestamp
ON MATCH SET r.lastSeenAt = $timestamp

RETURN count(c) AS componentsProcessed
