import { z } from 'zod'
import { BACKUP_FREQUENCIES } from '@/lib/backup/schedule'

export const appNameSchema = z
  .string('Enter an application name.')
  .trim()
  .min(1, 'Enter an application name.')
  .max(60, 'Application name must be 60 characters or fewer.')

export const backupScheduleSchema = z.object({
  // Windows "Copy as path" wraps the path in quotes.
  folder: z
    .string()
    .trim()
    .transform((value) => value.replace(/^"(.*)"$/, '$1').trim())
    .pipe(z.string().max(500, 'Folder path must be 500 characters or fewer.'))
    .default(''),
  frequency: z.enum(BACKUP_FREQUENCIES, 'Choose how often to back up.'),
  time: z.string('Choose a valid time.').regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose a valid time.'),
  weekday: z.coerce.number('Choose a day of the week.').int().min(0, 'Choose a day of the week.').max(6, 'Choose a day of the week.'),
  monthDay: z.coerce.number('Enter a day from 1 to 31.').int('Enter a day from 1 to 31.').min(1, 'Enter a day from 1 to 31.').max(31, 'Enter a day from 1 to 31.'),
})
