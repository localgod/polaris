// Add User node for authentication and authorization
// Users authenticate via OAuth and can be associated with teams

// Create User node constraint
CREATE CONSTRAINT user_id_unique IF NOT EXISTS
FOR (u:User) REQUIRE u.id IS UNIQUE;

// Create indexes for common queries
CREATE INDEX user_email IF NOT EXISTS
FOR (u:User) ON (u.email);

CREATE INDEX user_provider IF NOT EXISTS
FOR (u:User) ON (u.provider);

CREATE INDEX user_role IF NOT EXISTS
FOR (u:User) ON (u.role);

CREATE INDEX user_last_login IF NOT EXISTS
FOR (u:User) ON (u.lastLogin);

// User properties:
// - id: string (OAuth provider user ID)
// - email: string
// - name: string
// - provider: string (github, google, etc.)
// - role: string (user, admin, superuser)
// - avatarUrl: string (optional)
// - createdAt: datetime
// - lastLogin: datetime

// Relationships:
// - (User)-[:MEMBER_OF]->(Team) - User belongs to a team
// - (User)-[:CAN_MANAGE]->(Team) - User can manage team (team lead)
