// Migration: Backfill USES.isDirect from the component dependency graph
//
// Some imported SBOMs have Component->Component DEPENDS_ON edges but no root
// component entry that identifies the direct dependency list. In that shape,
// a system's direct dependencies are the components used by that system that
// are not depended on by another component used by the same system.

CALL {
  MATCH (s:System)-[u:USES]->(c:Component)
  WHERE coalesce(u.isDirect, false) = false
    AND EXISTS {
      MATCH (s)-[:USES]->(source:Component)-[:DEPENDS_ON]->(target:Component)<-[:USES]-(s)
      WHERE source <> target
    }
    AND NOT EXISTS {
      MATCH (s)-[:USES]->(parent:Component)-[:DEPENDS_ON]->(c)
      WHERE parent <> c
    }
  SET u.isDirect = true,
      u.directInferredFrom = 'dependencyGraph',
      u.directInferredAt = datetime()
} IN TRANSACTIONS OF 1000 ROWS;
