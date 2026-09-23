import { z } from 'zod'

export const idPatternSchema = z.object({
  pattern: z
    .string()
    .trim()
    .min(1, 'Pattern is required')
    .regex(/^[A-Za-z0-9#\-./]+$/, 'Use letters, digits, # (digit placeholder), and separators like - or /'),
  status: z.enum(['active', 'inactive']).default('active'),
})

export type IdPatternInput = z.infer<typeof idPatternSchema>
