// Down migration: Remove expression property from HAS_LICENSE relationships
MATCH ()-[r:HAS_LICENSE]->()
WHERE r.expression IS NOT NULL
REMOVE r.expression;
