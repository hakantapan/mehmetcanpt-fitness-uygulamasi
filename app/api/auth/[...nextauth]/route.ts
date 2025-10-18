import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendLoginNotificationEmail } from '@/lib/mail'
import type { NextAuthOptions } from 'next-auth'
import { ensureMailScheduler } from '@/lib/scheduler'

ensureMailScheduler()

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            },
            include: {
              profile: true
            }
          })

          if (!user || !user.isActive) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            role: user.role as 'ADMIN' | 'TRAINER' | 'CLIENT',
            name: user.profile?.firstName && user.profile?.lastName 
              ? `${user.profile.firstName} ${user.profile.lastName}`
              : user.email,
            image: user.profile?.avatar || null
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role as 'ADMIN' | 'TRAINER' | 'CLIENT'
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as 'ADMIN' | 'TRAINER' | 'CLIENT'
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  secret: process.env.NEXTAUTH_SECRET,
  events: {
    async signIn({ user }) {
      try {
        if (user?.email) {
          await sendLoginNotificationEmail(
            user.email,
            {
              name: user.name,
              ip: null,
            },
            {
              actorId: typeof user.id === 'string' ? user.id : null,
              actorEmail: user.email,
              context: {
                userId: user.id,
              },
            },
          )
        }
      } catch (error) {
        console.error('Login notification error:', error)
      }
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
