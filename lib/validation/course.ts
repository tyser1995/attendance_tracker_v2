import { z } from 'zod'

export const courseSchema = z.object({
  courseCode: z.string().trim().min(1, 'Course code is required'),
  courseName: z.string().trim().min(1, 'Course name is required'),
  yearLevel: z.string().trim().optional().or(z.literal('')),
})

export type CourseInput = z.infer<typeof courseSchema>
