import { z } from 'zod'

export const studentSchema = z.object({
  idNumber: z.string().trim().min(1, 'ID number is required'),
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  middleName: z.string().trim().optional().or(z.literal('')),
  dob: z.string().trim().optional().or(z.literal('')),
  sex: z.enum(['Male', 'Female', '']).optional(),
  courseId: z.string().trim().optional().or(z.literal('')),
})

export type StudentInput = z.infer<typeof studentSchema>
