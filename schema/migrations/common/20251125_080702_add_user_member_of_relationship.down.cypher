/*
 * Rollback: Remove MEMBER_OF Relationship from User
 * 
 * Removes all MEMBER_OF relationships from User nodes.
 * This will remove all team memberships.
 */

// Drop relationship index
DROP INDEX user_member_of IF EXISTS;

// Remove all MEMBER_OF relationships from User
MATCH (u:User)-[r:MEMBER_OF]->()
DELETE r;
