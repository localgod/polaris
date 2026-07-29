MATCH (l:License)
{{WHERE_CONDITIONS}}
RETURN count(l) as total
