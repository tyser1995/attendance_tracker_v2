import { z } from 'zod'

// What a browser may report. The username and role always come from the session, never from here.
export const clientLogsSchema = z.object({
  activity: z
    .array(
      z.object({
        action: z.enum(['page_view', 'click']),
        path: z.string().max(500),
        target: z.string().max(200).optional(),
      })
    )
    .max(50)
    .default([]),
  errors: z
    .array(
      z.object({
        message: z.string().max(2000),
        stack: z.string().max(8000).optional(),
        digest: z.string().max(100).optional(),
        path: z.string().max(500),
      })
    )
    .max(10)
    .default([]),
})

export type ClientLogs = z.input<typeof clientLogsSchema>
