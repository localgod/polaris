/**
 * @openapi
 * /auth/{provider}:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: OAuth authentication endpoints
 *     description: |
 *       NextAuth.js authentication endpoints for OAuth providers.
 *       
 *       **Available Providers:**
 *       - GitHub OAuth
 *       
 *       **Endpoints:**
 *       - `GET /api/auth/signin` - Sign in page
 *       - `GET /api/auth/signout` - Sign out
 *       - `GET /api/auth/callback/{provider}` - OAuth callback
 *       - `GET /api/auth/session` - Get current session
 *       - `GET /api/auth/csrf` - Get CSRF token
 *       - `GET /api/auth/providers` - List available providers
 *       
 *       **Authorization Levels:**
 *       - `user` - Default role for authenticated users
 *       - `superuser` - Admin role (configured via SUPERUSER_EMAILS env var)
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: false
 *         schema:
 *           type: string
 *         description: OAuth provider name (e.g., "github")
 *     responses:
 *       200:
 *         description: Authentication response
 *       302:
 *         description: Redirect to OAuth provider or callback
 */
import { NuxtAuthHandler } from '#auth'
import GithubProvider from 'next-auth/providers/github'
import { UserService } from '../../services/user.service'

export default NuxtAuthHandler({
  secret: process.env.AUTH_SECRET || 'replace-me-in-production',
  
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  
  providers: [
    // @ts-expect-error Use .default here for it to work during SSR
    GithubProvider.default({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || ''
    })
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in or token refresh
      if (account && user) {
        token.accessToken = account.access_token
        token.provider = account.provider
        token.userId = user.id
      }

      // Fetch user role and team from database on every token refresh
      if (token.userId) {
        try {
          const userService = new UserService()
          const authData = await userService.getAuthData(token.userId as string)
          
          if (authData) {
            token.role = authData.role
            token.email = authData.email
            token.teams = authData.teams
          }
        } catch (error) {
          console.error('Error fetching user data from Neo4j:', error)
        }
      }

      return token
    },

    async session({ session, token }) {
      // Add custom fields to session
      if (session.user) {
        session.user.id = token.userId as string
        session.user.provider = token.provider as string
        session.user.role = (token.role as 'user' | 'superuser') || 'user'
        session.user.teams = (token.teams as Array<{ name: string; email: string | null }>) || []
      }
      return session
    },

    async signIn({ user, account, profile }) {
      // Create or update user in Neo4j on sign in
      if (user && account && profile) {
        try {
          // Check if user email is in superuser list
          const superuserEmails = (process.env.SUPERUSER_EMAILS || '')
            .split(',')
            .map(email => email.trim().toLowerCase())
            .filter(email => email.length > 0)
          
          const isSuperuser = user.email && superuserEmails.includes(user.email.toLowerCase())
          const role = isSuperuser ? 'superuser' : 'user'

          const userService = new UserService()
          await userService.createOrUpdateUser({
            id: user.id,
            email: user.email || '',
            name: user.name ?? null,
            provider: account.provider,
            avatarUrl: user.image || null,
            isSuperuser: Boolean(isSuperuser),
            role
          })
        } catch (error) {
          console.error('Error creating/updating user in Neo4j:', error)
          // Don't block sign in if database update fails
        }
      }
      return true
    }
  },

  pages: {
    signIn: '/auth/signin'
  }
})
