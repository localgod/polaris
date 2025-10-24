# Authentication Setup Guide

Quick guide to get authentication working in your local development environment.

## Prerequisites

- GitHub account
- Polaris running locally

## Step 1: Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: Polaris Local Dev
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Copy the **Client ID**
6. Click "Generate a new client secret" and copy the **Client Secret**

## Step 2: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your values:
   ```bash
   # Generate a secure secret
   AUTH_SECRET=$(openssl rand -base64 32)
   
   # Add your GitHub OAuth credentials
   GITHUB_CLIENT_ID=your_client_id_here
   GITHUB_CLIENT_SECRET=your_client_secret_here
   
   # Add your email as superuser
   SUPERUSER_EMAILS=your.email@example.com
   ```

## Step 3: Run Database Migration

```bash
npm run migrate:up
```

This creates the User node and relationships in Neo4j.

## Step 4: Start the Development Server

```bash
npm run dev
```

## Step 5: Test Authentication

1. Open http://localhost:3000
2. Click "Sign In" in the sidebar
3. Click "Sign in with GitHub"
4. Authorize the application
5. You should be redirected back to the dashboard
6. Your user menu should appear in the sidebar

## Step 6: Verify Superuser Status

Check your user in Neo4j Browser:

```cypher
MATCH (u:User {email: "your.email@example.com"})
RETURN u
```

You should see `role: "superuser"`.

## Step 7: Create a Test Team (Optional)

```cypher
CREATE (t:Team {
  name: "Test Team",
  email: "test@example.com",
  responsibilityArea: "testing"
})
```

## Step 8: Assign Yourself to the Team

Using the API (as superuser):

```bash
# Get your user ID first
curl http://localhost:3000/api/admin/users | jq '.data[] | {id, email}'

# Assign yourself to the team
curl -X POST http://localhost:3000/api/admin/users/YOUR_USER_ID/teams \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{"teams": ["Test Team"]}'
```

Or directly in Neo4j:

```cypher
MATCH (u:User {email: "your.email@example.com"})
MATCH (t:Team {name: "Test Team"})
MERGE (u)-[:MEMBER_OF]->(t)
```

## Troubleshooting

### "Callback URL mismatch" error

Make sure your GitHub OAuth app callback URL exactly matches:
```
http://localhost:3000/api/auth/callback/github
```

### "Team membership required" error

You need to assign yourself to a team. Even superusers need team membership to test team-scoped permissions (though they can bypass them).

### Session not persisting

1. Check that `AUTH_SECRET` is set in `.env`
2. Clear your browser cookies
3. Restart the dev server

### User not showing as superuser

1. Check that your email is in `SUPERUSER_EMAILS`
2. Emails are case-insensitive
3. Sign out and sign in again
4. Check the database: `MATCH (u:User) RETURN u`

## Next Steps

- Read [AUTHENTICATION.md](./AUTHENTICATION.md) for complete documentation
- Create more teams in Neo4j
- Assign other users to teams
- Test team-scoped permissions
- Implement protected API endpoints

## Production Deployment

For production, you'll need to:

1. Create a new GitHub OAuth app with your production URL
2. Set `AUTH_ORIGIN` environment variable
3. Use a secure `AUTH_SECRET` (never commit this!)
4. Configure `SUPERUSER_EMAILS` with real admin emails
5. Set up proper SSL/TLS certificates

See [AUTHENTICATION.md](./AUTHENTICATION.md) for more details.
