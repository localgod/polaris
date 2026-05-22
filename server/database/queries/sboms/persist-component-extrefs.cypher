// Replace HAS_EXTERNAL_REF relationships for a batch of components.
// Runs as a dedicated transaction to avoid chaining eager barriers with
// hash and license writes.
//
// Only relationships are deleted — ExternalReference nodes are shared across
// components and are left intact to avoid corrupting other components.
UNWIND $components AS comp
MATCH (c:Component {purl: COALESCE(comp.purl, comp.name + '@' + COALESCE(comp.version, 'unknown'))})

OPTIONAL MATCH (c)-[oldRefRel:HAS_EXTERNAL_REF]->(:ExternalReference)
DELETE oldRefRel

WITH c, comp
FOREACH (ref IN comp.externalReferences |
  MERGE (er:ExternalReference {type: ref.type, url: ref.url})
  MERGE (c)-[:HAS_EXTERNAL_REF]->(er)
)

RETURN count(c) AS componentsProcessed
