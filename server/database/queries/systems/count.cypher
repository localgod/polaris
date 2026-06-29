MATCH (s:System)
{{WHERE_CONDITIONS}}
RETURN count(s) AS total
