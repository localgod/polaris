# Authentication & Authorization

Polaris uses OAuth-based authentication with team-scoped authorization.

## Overview

- **Public Read Access**: All data is publicly viewable without authentication
- **Authenticated Write Access**: Users must authenticate via OAuth to make changes
- **Team-Based Authorization**: Users must belong to a team to modify data
- **Team-Scoped Permissions**: Users can only modify data owned by their teams
- **Superuser Access**: Designated users have full access and can manage user permissions

## User Roles

### Anonymous (Unauthenticated)

- ✅ Read all data (technologies, teams, systems, etc.)
- ❌ No write access

### Authenticated User (No Team)

- ✅ Read all data
- ❌ No write access until assigned to a team
- Can see their own profile

### Authorized User (Team Member)

- ✅ Read all data
- ✅ Write access to resources owned by their team(s)
- ❌ Cannot modify other teams' resources

### Superuser

- ✅ Full read/write access to all resources
- ✅ Can manage users and team assignments
- ✅ Can assign/remove team memberships
- ✅ Can grant team management permissions

## Configuration

### Environment Variables

```bash
# Authentication Secret (required)
# Generate with: openssl rand -base64 32
AUTH_SECRET=your-secret-here

# GitHub OAuth (required)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Superuser Configuration
# Comma-separated list of email addresses
SUPERUSER_EMAILS=admin@company.com,lead@company.com

# Auth Origin (optional, for production)
AUTH_ORIGIN=https://your-domain.com/api/auth
```

### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL to: `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID and Client Secret to `.env`

## Graph Model

### User Node

```cypher
User {
  id: string           // OAuth provider user ID
  email: string        // User email
  name: string         // Display name
  provider: string     // OAuth provider (github, google, etc.)
  role: string         // user | superuser
  avatarUrl: string    // Profile picture URL
  createdAt: datetime  // Account creation
  lastLogin: datetime  // Last login timestamp
}
```

### Relationships

```cypher
// Team membership
(User)-[:MEMBER_OF]->(Team)

// Team management permission (can assign users to team)
(User)-[:CAN_MANAGE]->(Team)
```

## API Protection

### Server-Side Utilities

```typescript
// Require authentication
const user = await requireAuth(event)

// Require authorization (auth + team membership)
const user = await requireAuthorization(event)

// Require superuser access
const user = await requireSuperuser(event)

// Require access to specific team
const user = await requireTeamAccess(event, 'Frontend Platform')

// Validate team ownership of resource
await validateTeamOwnership(event, 'System', 'Customer Portal')
```

### Example Protected Endpoint

```typescript
// server/api/systems/[name]/update.post.ts
export default defineEventHandler(async (event) => {
  const systemName = getRouterParam(event, 'name')
  
  // Require authorization
  await requireAuthorization(event)
  
  // Validate team ownership
  await validateTeamOwnership(event, 'System', systemName)
  
  // Proceed with update...
})
```

## Team-Scoped Permissions

### System Ownership

Users can only modify systems owned by their team:

```cypher
// Check if user's team owns the system
MATCH (s:System {name: $systemName})
MATCH (t:Team)-[:OWNS]->(s)
WHERE t.name IN $userTeamNames
```

### Technology Stewardship

Users can only modify technologies stewarded by their team:

```cypher
// Check if user's team stewards the technology
MATCH (tech:Technology {name: $techName})
MATCH (t:Team)-[:STEWARDED_BY]->(tech)
WHERE t.name IN $userTeamNames
```

## User Management (Superuser Only)

### List All Users

```bash
GET /api/admin/users
```

Returns all users with their team memberships and roles.

### Assign User to Teams

```bash
POST /api/admin/users/{userId}/teams
Content-Type: application/json

{
  "teams": ["Frontend Platform", "Backend Platform"],
  "canManage": ["Frontend Platform"]  // Optional: grant management permission
}
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "github|12345",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "teams": [
      { "name": "Frontend Platform", "email": "frontend@company.com" }
    ],
    "canManage": ["Frontend Platform"]
  }
}
```

## Client-Side Usage

### Check Authentication Status

```vue
<script setup>
const { status, data: session } = useAuth()
</script>

<template>
  <div v-if="status === 'authenticated'">
    <p>Welcome, {{ session.user.name }}!</p>
    <p>Role: {{ session.user.role }}</p>
    <p>Teams: {{ session.user.teams.map(t => t.name).join(', ') }}</p>
  </div>
  <div v-else>
    <NuxtLink to="/auth/signin">Sign In</NuxtLink>
  </div>
</template>
```

### Sign In/Out

```vue
<script setup>
const { signIn, signOut } = useAuth()
</script>

<template>
  <button @click="signIn('github')">Sign In with GitHub</button>
  <button @click="signOut()">Sign Out</button>
</template>
```

### Conditional UI Based on Authorization

```vue
<script setup>
const { data: session } = useAuth()

const canEdit = computed(() => {
  if (!session.value?.user) return false
  if (session.value.user.role === 'superuser') return true
  return session.value.user.teams?.length > 0
})
</script>

<template>
  <button v-if="canEdit" @click="handleEdit">Edit</button>
</template>
```

## Security Considerations

1. **JWT Tokens**: Session data is stored in JWT tokens, not in the database
2. **Token Refresh**: User role and team membership are refreshed on every token refresh
3. **Database Validation**: All write operations validate team ownership server-side
4. **No Client Trust**: Never trust client-side authorization checks for security
5. **Superuser Emails**: Store in environment variables, not in code

## Migration Path

### Initial Setup

1. Set `SUPERUSER_EMAILS` in `.env`
2. Configure GitHub OAuth credentials
3. Run migrations: `npm run migrate:up`
4. First superuser signs in via GitHub
5. Superuser assigns other users to teams

### Adding New Users

1. User signs in via GitHub OAuth
2. User account created with `role: 'user'`
3. Superuser assigns user to team(s)
4. User can now modify their team's resources

## Troubleshooting

### "Team membership required" Error

**Cause**: User is authenticated but not assigned to any team

**Solution**: Superuser must assign user to a team via `/api/admin/users/{userId}/teams`

### "Access denied" Error

**Cause**: User trying to modify resource owned by another team

**Solution**: 
- Verify resource ownership: `MATCH (t:Team)-[:OWNS]->(s:System {name: 'X'})`
- Assign user to the correct team, or
- Transfer resource ownership to user's team

### User Not Showing as Superuser

**Cause**: Email not in `SUPERUSER_EMAILS` or case mismatch

**Solution**: 
- Check `.env` file has correct email
- Emails are case-insensitive
- Restart server after changing `.env`
- User must sign out and sign in again

## Future Enhancements

- [ ] Additional OAuth providers (Google, Azure AD)
- [ ] Fine-grained permissions (read-only team members)
- [ ] Audit logging for all write operations
- [ ] Team invitation system
- [ ] Self-service team requests
- [ ] API key authentication for CI/CD
