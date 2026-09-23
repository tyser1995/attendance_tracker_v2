import { z } from 'zod'

export const createUserSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'STAFF']),
})

export const updateUserSchema = z.object({
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'STAFF']),
  password: z.union([z.string().min(6, 'Password must be at least 6 characters'), z.literal('')]).optional(),
})
