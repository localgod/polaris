// Phase 1: MERGE Component nodes and USES relationships, set scalar properties.
// Deliberately excludes hashes, licenses, and external references — those are
// handled separately in persist-components-relations.cypher so each transaction
// stays small enough to fit within Neo4j's transaction memory limit.
//
// MERGE key: purl is the canonical unique identifier for a component. For
// components without a purl, falls back to name@version to avoid null-key
// collisions (null != null in Neo4j MERGE).
//
// ON CREATE / ON MATCH set a transient _new flag used only for counting;
// no pre-MERGE OPTIONAL MATCH is needed to detect existence.
MATCH (s:System {name: $systemName})
UNWIND $components AS comp
WITH s, comp,
     COALESCE(comp.purl, comp.name + '@' + COALESCE(comp.version, 'unknown')) AS componentPurl

MERGE (c:Component {purl: componentPurl})
ON CREATE SET
  c.name = comp.name,
  c.version = COALESCE(comp.version, 'unknown'),
  c.packageManager = COALESCE(comp.packageManager, 'unknown'),
  c.createdAt = $timestamp,
  c._new = true
ON MATCH SET
  c.updatedAt = $timestamp,
  c._new = false

WITH s, c, comp, c._new AS isNew
REMOVE c._new

FOREACH (_ IN CASE WHEN comp.cpe IS NOT NULL THEN [1] ELSE [] END | SET c.cpe = comp.cpe)
FOREACH (_ IN CASE WHEN comp.bomRef IS NOT NULL THEN [1] ELSE [] END | SET c.bomRef = comp.bomRef)
FOREACH (_ IN CASE WHEN comp.type IS NOT NULL THEN [1] ELSE [] END | SET c.type = comp.type)
FOREACH (_ IN CASE WHEN comp.group IS NOT NULL THEN [1] ELSE [] END | SET c.group = comp.group)
FOREACH (_ IN CASE WHEN comp.scope IS NOT NULL THEN [1] ELSE [] END | SET c.scope = comp.scope)
FOREACH (_ IN CASE WHEN comp.copyright IS NOT NULL THEN [1] ELSE [] END | SET c.copyright = comp.copyright)
FOREACH (_ IN CASE WHEN comp.supplier IS NOT NULL THEN [1] ELSE [] END | SET c.supplier = comp.supplier)
FOREACH (_ IN CASE WHEN comp.author IS NOT NULL THEN [1] ELSE [] END | SET c.author = comp.author)
FOREACH (_ IN CASE WHEN comp.publisher IS NOT NULL THEN [1] ELSE [] END | SET c.publisher = comp.publisher)
FOREACH (_ IN CASE WHEN comp.homepage IS NOT NULL THEN [1] ELSE [] END | SET c.homepage = comp.homepage)
FOREACH (_ IN CASE WHEN comp.description IS NOT NULL THEN [1] ELSE [] END | SET c.description = comp.description)

MERGE (s)-[r:USES]->(c)
ON CREATE SET r.addedAt = $timestamp, r._new = true
ON MATCH SET r.lastSeenAt = $timestamp, r._new = false

WITH isNew, r, r._new AS relIsNew
REMOVE r._new

RETURN sum(CASE WHEN isNew THEN 1 ELSE 0 END) AS componentsAdded,
       sum(CASE WHEN isNew THEN 0 ELSE 1 END) AS componentsUpdated,
       sum(CASE WHEN relIsNew THEN 1 ELSE 0 END) AS relationshipsCreated
