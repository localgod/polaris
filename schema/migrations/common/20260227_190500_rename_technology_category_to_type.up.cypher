// Migration: Rename Technology.category to Technology.type
//
// Aligns the property name with CycloneDX ComponentType values.
// Maps legacy category values to valid CycloneDX types.

// Step 1: Map legacy values to CycloneDX ComponentType equivalents
MATCH (t:Technology)
WHERE t.category IS NOT NULL
SET t.type = CASE t.category
  WHEN 'framework' THEN 'framework'
  WHEN 'library' THEN 'library'
  WHEN 'container' THEN 'container'
  WHEN 'platform' THEN 'platform'
  WHEN 'application' THEN 'application'
  WHEN 'runtime' THEN 'platform'
  WHEN 'database' THEN 'platform'
  WHEN 'cache' THEN 'platform'
  WHEN 'language' THEN 'library'
  WHEN 'tool' THEN 'application'
  WHEN 'other' THEN 'application'
  ELSE 'application'
END
REMOVE t.category;

// Step 2: Drop the old index on category
DROP INDEX technology_category IF EXISTS;

// Step 3: Create new index on type
CREATE INDEX technology_type IF NOT EXISTS
FOR (t:Technology)
ON (t.type);
