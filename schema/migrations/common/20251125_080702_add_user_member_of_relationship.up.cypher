/*
 * Migration: Add MEMBER_OF Relationship to User
 * Version: 2025.11.25.080702
 * Author: @ona
 * 
 * Description:
 * Creates MEMBER_OF relationship from User to Team nodes.
 * This enables graph queries to find all users in a team and all teams
 * a user belongs to, providing proper authorization and access control.
 *
 * The relationship is optional - users can exist without team membership.
 * Team membership is added as a separate step when users need to manage
 * data in the model.
 *
 * The relationship includes properties:
 * - joinedAt: datetime when user joined the team
 * - role: string (member, lead) - optional team-specific role
 *
 * Dependencies:
 * - User and Team nodes must exist
 *
 * Rollback: See corresponding .down.cypher file
 */

// Note: This migration creates the relationship structure but does not
// create any actual MEMBER_OF relationships. Those will be created
// through the application when users are added to teams.

// Create index on MEMBER_OF relationship for efficient queries
CREATE INDEX user_member_of IF NOT EXISTS
FOR ()-[r:MEMBER_OF]-() ON (r.joinedAt);
