'use server'

import { AuthError } from 'next-auth'
import { signIn } from '@/auth'

export async function loginAction(_prevState: string | null, formData: FormData): Promise<string | null> {
  const username = String(formData.get('username') ?? '')
  const password = String(formData.get('password') ?? '')

  try {
    await signIn('credentials', { username, password, redirectTo: '/scanner' })
    return null
  } catch (error) {
    if (error instanceof AuthError) {
      return 'Invalid username or password.'
    }
    throw error
  }
}
