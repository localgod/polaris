import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      provider: string
      role: 'user' | 'superuser'
      teams: Array<{
        name: string
        email: string
      }>
    } & DefaultSession['user']
  }

  interface User {
    id: string
    role?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string
    provider?: string
    role?: string
    teams?: Array<{
      name: string
      email: string
    }>
  }
}
