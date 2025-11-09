import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendLoginNotificationEmail } from '@/lib/mail'
import type { NextAuthOptions } from 'next-auth'
import { ensureMailScheduler } from '@/lib/scheduler'
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

ensureMailScheduler()

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Rate limiting: Email bazlı (brute force koruması)
        // 15 dakikada maksimum 5 başarısız deneme
        const rateLimitKey = `login:${credentials.email.toLowerCase()}`
        const rateLimit = checkRateLimit(rateLimitKey, {
          maxRequests: 5,
          windowMs: 15 * 60 * 1000 // 15 dakika
        })

        if (!rateLimit.success) {
          // Rate limit aşıldı, ancak kullanıcıya bilgi vermeden null döndür
          // Güvenlik için: Başarısız login mesajı vermiyoruz
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
            // Başarısız login - rate limit sayacı zaten artırıldı
            return null
          }

          // Başarılı login - rate limit sayacını sıfırla
          resetRateLimit(rateLimitKey)

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
          logger.error('Auth error:', error)
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
        logger.error('Login notification error:', error)
      }
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
