// Migration: Add isDirect to USES edges and drop the DIRECT_DEP relationship type
//
// isDirect=true on a USES edge replaces the separate DIRECT_DEP relationship.
// This collapses two relationship types into one, enabling queries like:
//   MATCH (s:System)-[:USES {isDirect: true, scope: 'runtime'}]->(c) RETURN c
//
// Step 1: For existing USES edges that have a corresponding DIRECT_DEP edge,
//         set isDirect=true. All other USES edges get isDirect=false.
MATCH (s:System)-[u:USES]->(c:Component)
WITH s, u, c,
     EXISTS { MATCH (s)-[:DIRECT_DEP]->(c) } AS hasDirect
SET u.isDirect = hasDirect;

// Step 2: Drop all DIRECT_DEP relationships — isDirect on USES supersedes them.
MATCH ()-[r:DIRECT_DEP]->()
DELETE r;

// Step 3: Add indexes on USES.scope and USES.isDirect for efficient filtering.
CREATE INDEX uses_scope IF NOT EXISTS FOR ()-[r:USES]-() ON (r.scope);
CREATE INDEX uses_is_direct IF NOT EXISTS FOR ()-[r:USES]-() ON (r.isDirect);
