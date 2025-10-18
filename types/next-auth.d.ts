import NextAuth from 'next-auth'

// UserRole type tanımı
type UserRole = 'ADMIN' | 'TRAINER' | 'CLIENT'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      image?: string | null
    }
  }

  interface User {
    id: string
    email: string
    role: UserRole
    name: string
    image?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
  }
}
