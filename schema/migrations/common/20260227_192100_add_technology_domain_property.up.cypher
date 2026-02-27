// Migration: Add domain property to Technology nodes
//
// Adds an optional domain field for classifying technologies by
// architectural concern (data-platform, infrastructure, etc.).
// Infers initial values from the existing type property.

// Step 1: Set domain based on type for existing technologies
MATCH (t:Technology)
WHERE t.domain IS NULL
SET t.domain = CASE t.type
  WHEN 'platform' THEN 'data-platform'
  WHEN 'framework' THEN 'framework'
  WHEN 'library' THEN 'developer-tooling'
  WHEN 'container' THEN 'infrastructure'
  WHEN 'application' THEN 'other'
  WHEN 'operating-system' THEN 'infrastructure'
  WHEN 'firmware' THEN 'infrastructure'
  WHEN 'data' THEN 'data-platform'
  WHEN 'machine-learning-model' THEN 'other'
  ELSE 'other'
END;

// Step 2: Create index on domain for filtering
CREATE INDEX technology_domain IF NOT EXISTS
FOR (t:Technology)
ON (t.domain);
