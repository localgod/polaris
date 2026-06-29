CALL {
  MATCH (t:Technology)
  RETURN count(t) AS technologies
}
CALL {
  MATCH (s:System)
  RETURN count(s) AS systems,
         sum(CASE WHEN toLower(coalesce(s.businessCriticality, '')) = 'critical' THEN 1 ELSE 0 END) AS critical,
         sum(CASE WHEN toLower(coalesce(s.businessCriticality, '')) = 'high' THEN 1 ELSE 0 END) AS high,
         sum(CASE WHEN toLower(coalesce(s.businessCriticality, '')) = 'medium' THEN 1 ELSE 0 END) AS medium,
         sum(CASE WHEN toLower(coalesce(s.businessCriticality, '')) = 'low' THEN 1 ELSE 0 END) AS low
}
CALL {
  MATCH (vc:VersionConstraint)
  RETURN count(vc) AS versionConstraints
}
RETURN technologies,
       systems,
       versionConstraints,
       critical,
       high,
       medium,
       low
