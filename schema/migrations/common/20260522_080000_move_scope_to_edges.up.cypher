// Migration: Remove stale scope property from Component nodes
//
// scope describes how a specific system uses a component, not what the
// component intrinsically is. It now lives on the USES and DIRECT_DEP edges.
// Any scope values stored on Component nodes are unreliable (last-write-wins
// across systems) and must be removed.

MATCH (c:Component)
WHERE c.scope IS NOT NULL
REMOVE c.scope;
