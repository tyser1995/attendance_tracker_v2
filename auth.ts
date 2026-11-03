import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma/client'
import { verifyPassword } from '@/lib/auth/password'
import { logActivity } from '@/lib/logs/log'
import type { Role } from '@/app/generated/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const username = credentials?.username
        const password = credentials?.password
        if (typeof username !== 'string' || typeof password !== 'string') return null

        const user = await prisma.user.findUnique({ where: { username } })
        const valid = user ? await verifyPassword(password, user.passwordHash) : false
        if (!user || !valid) {
          await logActivity({ action: 'login_failed', username })
          return null
        }

        await logActivity({ action: 'login', username: user.username, role: user.role })
        return { id: user.id, username: user.username, role: user.role }
      },
    }),
  ],
  events: {
    async signOut(message) {
      const token = 'token' in message ? message.token : null
      await logActivity({ action: 'logout', username: token?.username as string | undefined, role: token?.role as string | undefined })
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.username = token.username as string
      session.user.role = token.role as Role
      return session
    },
  },
})
