// Rollback: Rename Technology.type back to Technology.category
MATCH (t:Technology)
WHERE t.type IS NOT NULL
SET t.category = t.type
REMOVE t.type;

// Drop the new index
DROP INDEX technology_type IF EXISTS;

// Recreate the old index
CREATE INDEX technology_category IF NOT EXISTS
FOR (t:Technology)
ON (t.category);
