'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma/client'
import { idPatternSchema } from '@/lib/validation/idPattern'
import { buildRegex } from '@/lib/idPattern/buildRegex'

export type FormState = { errors?: Record<string, string[]>; formError?: string } | null

export async function createIdPattern(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = idPatternSchema.safeParse({
    pattern: formData.get('pattern'),
    status: formData.get('status') ?? 'active',
  })
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors }

  const { pattern, status } = parsed.data
  const existing = await prisma.idPattern.findUnique({ where: { pattern } })
  if (existing) return { formError: `Pattern '${pattern}' already exists.` }

  await prisma.idPattern.create({ data: { pattern, regex: buildRegex(pattern), status } })

  revalidatePath('/patterns')
  redirect('/patterns')
}

export async function toggleIdPatternStatus(id: string, currentStatus: string): Promise<void> {
  await prisma.idPattern.update({
    where: { id },
    data: { status: currentStatus === 'active' ? 'inactive' : 'active' },
  })
  revalidatePath('/patterns')
}

export async function deleteIdPattern(id: string): Promise<void> {
  await prisma.idPattern.delete({ where: { id } })
  revalidatePath('/patterns')
}
