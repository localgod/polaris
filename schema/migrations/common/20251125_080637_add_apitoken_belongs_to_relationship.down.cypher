/*
 * Rollback: Remove BELONGS_TO Relationship from ApiToken
 * 
 * Removes all BELONGS_TO relationships from ApiToken nodes.
 * The userId property is preserved for potential re-creation.
 */

// Drop relationship index
DROP INDEX apitoken_belongs_to IF EXISTS;

// Remove all BELONGS_TO relationships from ApiToken
MATCH (t:ApiToken)-[r:BELONGS_TO]->()
DELETE r;
