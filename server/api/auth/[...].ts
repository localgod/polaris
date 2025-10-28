import { NuxtAuthHandler } from '#auth'
import GithubProvider from 'next-auth/providers/github'
import neo4j from 'neo4j-driver'

// Create Neo4j driver instance for auth callbacks
const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || 'neo4j',
    process.env.NEO4J_PASSWORD || 'devpassword'
  )
)

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
          const session = driver.session()

          try {
            const result = await session.run(
              `
              MATCH (u:User {id: $userId})
              OPTIONAL MATCH (u)-[:MEMBER_OF]->(t:Team)
              RETURN u.role as role, 
                     u.email as email,
                     collect({
                       name: t.name,
                       email: t.email
                     }) as teams
              `,
              { userId: token.userId }
            )

            const record = result.records[0]
            if (record) {
              token.role = record.get('role')
              token.email = record.get('email')
              token.teams = record.get('teams').filter((t: { name: string | null }) => t.name !== null)
            }
          } finally {
            await session.close()
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
        session.user.teams = (token.teams as Array<{ name: string; email: string }>) || []
      }
      return session
    },

    async signIn({ user, account, profile }) {
      // Create or update user in Neo4j on sign in
      if (user && account && profile) {
        try {
          const session = driver.session()

          try {
            // Check if user email is in superuser list
            const superuserEmails = (process.env.SUPERUSER_EMAILS || '')
              .split(',')
              .map(email => email.trim().toLowerCase())
              .filter(email => email.length > 0)
            
            const isSuperuser = user.email && superuserEmails.includes(user.email.toLowerCase())
            const role = isSuperuser ? 'superuser' : 'user'

            await session.run(
              `
              MERGE (u:User {id: $id})
              ON CREATE SET u.createdAt = datetime(),
                           u.role = $role
              SET u.email = $email,
                  u.name = $name,
                  u.provider = $provider,
                  u.lastLogin = datetime(),
                  u.avatarUrl = $avatarUrl,
                  u.role = CASE 
                    WHEN $isSuperuser THEN 'superuser'
                    WHEN u.role = 'superuser' THEN 'superuser'
                    ELSE u.role
                  END
              RETURN u
              `,
              {
                id: user.id,
                email: user.email,
                name: user.name,
                provider: account.provider,
                avatarUrl: user.image || null,
                isSuperuser,
                role
              }
            )
          } finally {
            await session.close()
          }
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
