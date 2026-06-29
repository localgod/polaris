MATCH (s:System)-[u:USES]->(c:Component)-[:HAS_HEALTH_SNAPSHOT]->(h:HealthSnapshot)
WHERE u.isDirect = true
  AND lower(coalesce(s.businessCriticality, '')) IN ['critical', 'high']
  AND (
    coalesce(h.vulnerabilityCritical, 0) > 0 OR
    h.eolStatus = 'unsupported' OR
    h.isDeprecated = true
  )
RETURN count(DISTINCT s) AS systems,
       count(DISTINCT CASE WHEN lower(coalesce(s.businessCriticality, '')) = 'critical' THEN s END) AS criticalSystems,
       count(DISTINCT CASE WHEN lower(coalesce(s.businessCriticality, '')) = 'high' THEN s END) AS highSystems,
       count(DISTINCT c) AS affectedComponents
