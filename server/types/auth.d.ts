import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      provider: string
      role: 'user' | 'superuser'
      orgAdmin: boolean
      teams: Array<{
        name: string
        email: string | null
      }>
    } & DefaultSession['user']
  }

  interface User {
    id: string
    provider?: string
    role?: 'user' | 'superuser'
    orgAdmin?: boolean
    teams?: Array<{
      name: string
      email: string | null
    }>
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string
    provider?: string
    role?: string
    orgAdmin?: boolean
    teams?: Array<{
      name: string
      email: string | null
    }>
    accessToken?: string
  }
}
