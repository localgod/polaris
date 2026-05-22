// Replace HAS_LICENSE relationships for a batch of components.
// Runs as a dedicated transaction to avoid chaining eager barriers with
// hash and external-reference writes.
//
// Only relationships are deleted — License nodes are shared across components
// and are left intact to avoid corrupting other components.
// License text is only written on node creation; subsequent ingestions do not
// update it to avoid sending large text payloads over the wire unnecessarily.
UNWIND $components AS comp
MATCH (c:Component {purl: COALESCE(comp.purl, comp.name + '@' + COALESCE(comp.version, 'unknown'))})

OPTIONAL MATCH (c)-[oldLicRel:HAS_LICENSE]->(:License)
DELETE oldLicRel

WITH c, comp
FOREACH (lic IN comp.licenses |
  MERGE (l:License {id: COALESCE(lic.id, lic.name)})
  ON CREATE SET l.name = lic.name, l.url = lic.url, l.text = lic.text, l.expression = lic.expression
  ON MATCH SET l.name = COALESCE(lic.name, l.name), l.url = COALESCE(lic.url, l.url)
  FOREACH (_ IN CASE WHEN lic.allowed IS NOT NULL THEN [1] ELSE [] END | SET l.allowed = lic.allowed)
  MERGE (c)-[:HAS_LICENSE]->(l)
)

RETURN count(c) AS componentsProcessed
