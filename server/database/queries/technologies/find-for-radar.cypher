// Returns each Technology with its active organization TIME policy.
// Policy resolution (team/system exceptions) is not applied here since the
// Radar shows the authoritative org-level decision, not a context-specific view.
MATCH (t:Technology)
OPTIONAL MATCH (:Organization {name: 'default'})-[:SETS]->(p:TechnologyPolicy {status: 'active'})-[:GOVERNS]->(t)
RETURN t.name   as name,
       t.type   as type,
       t.domain as domain,
       p.time   as policyTime,
       p.id     as policyId
