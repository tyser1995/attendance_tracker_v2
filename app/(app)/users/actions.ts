'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma/client'
import { hashPassword } from '@/lib/auth/password'
import { createUserSchema, updateUserSchema } from '@/lib/validation/user'

export type FormState = { errors?: Record<string, string[]>; formError?: string } | null

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = createUserSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
    role: formData.get('role'),
  })
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors }

  const { username, password, role } = parsed.data
  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) return { formError: `Username '${username}' is already taken.` }

  await prisma.user.create({ data: { username, passwordHash: await hashPassword(password), role } })

  revalidatePath('/users')
  redirect('/users')
}

export async function updateUser(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = updateUserSchema.safeParse({
    role: formData.get('role'),
    password: formData.get('password') || undefined,
  })
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors }

  const { role, password } = parsed.data

  if (role !== 'SUPER_ADMIN') {
    const target = await prisma.user.findUnique({ where: { id } })
    if (target?.role === 'SUPER_ADMIN') {
      const superAdminCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } })
      if (superAdminCount <= 1) return { formError: 'At least one Super Admin must remain.' }
    }
  }

  await prisma.user.update({
    where: { id },
    data: { role, ...(password ? { passwordHash: await hashPassword(password) } : {}) },
  })

  revalidatePath('/users')
  redirect('/users')
}

export async function deleteUser(id: string): Promise<void> {
  const session = await auth()
  if (session?.user.id === id) throw new Error('You cannot delete your own account.')

  const target = await prisma.user.findUnique({ where: { id } })
  if (target?.role === 'SUPER_ADMIN') {
    const superAdminCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } })
    if (superAdminCount <= 1) throw new Error('At least one Super Admin must remain.')
  }

  await prisma.user.delete({ where: { id } })
  revalidatePath('/users')
}
