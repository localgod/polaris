MATCH (s:System)-[u:USES]->(c:Component)
WHERE u.isDirect = true
WITH DISTINCT c
OPTIONAL MATCH (c)-[:HAS_HEALTH_SNAPSHOT]->(h:HealthSnapshot)
WITH c, h,
     h IS NOT NULL AND (
       h.eolRefreshedAt IS NOT NULL OR
       h.vulnerabilityRefreshedAt IS NOT NULL OR
       h.maintenanceRefreshedAt IS NOT NULL OR
       h.securityScoreRefreshedAt IS NOT NULL
     ) AS hasAnyRefresh,
     h IS NOT NULL AND any(ts IN [
       h.eolRefreshedAt,
       h.vulnerabilityRefreshedAt,
       h.maintenanceRefreshedAt,
       h.securityScoreRefreshedAt
     ] WHERE ts IS NOT NULL AND datetime(ts) < datetime() - duration({days: $staleAfterDays})) AS hasStaleRefresh
RETURN count(c) AS totalComponents,
       sum(CASE WHEN hasAnyRefresh THEN 1 ELSE 0 END) AS refreshedComponents,
       sum(CASE WHEN hasStaleRefresh THEN 1 ELSE 0 END) AS staleComponents,
       sum(CASE WHEN NOT hasAnyRefresh THEN 1 ELSE 0 END) AS neverCheckedComponents
