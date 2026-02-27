// Rollback: Remove domain property from Technology nodes
MATCH (t:Technology)
WHERE t.domain IS NOT NULL
REMOVE t.domain;

// Drop the domain index
DROP INDEX technology_domain IF EXISTS;
