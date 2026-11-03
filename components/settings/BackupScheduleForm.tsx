'use client'

import { useActionState, useState } from 'react'
import { updateBackupSchedule, type FormState } from '@/app/(app)/settings/actions'
import type { BackupFrequency, BackupSchedule } from '@/lib/backup/schedule'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'
import { cn } from '@/lib/utils/cn'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function BackupScheduleForm({
  schedule,
  folder,
  defaultFolder,
}: {
  schedule: BackupSchedule
  folder: string
  defaultFolder: string
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateBackupSchedule, null)
  const [frequency, setFrequency] = useState<BackupFrequency>(schedule.frequency)

  return (
    <form action={formAction} className="max-w-xs space-y-3">
      <div>
        <Label htmlFor="frequency">Back up</Label>
        <Select
          id="frequency"
          name="frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as BackupFrequency)}
        >
          <option value="off">Off</option>
          <option value="every24h">Every 24 hours</option>
          <option value="daily">Every day</option>
          <option value="weekly">Every week</option>
          <option value="monthly">Every month</option>
        </Select>
      </div>

      {/* Hidden rather than removed, so unused fields keep their values when submitted. */}
      <div className={cn(frequency !== 'weekly' && 'hidden')}>
        <Label htmlFor="weekday">Day of the week</Label>
        <Select id="weekday" name="weekday" defaultValue={schedule.weekday}>
          {WEEKDAYS.map((day, index) => (
            <option key={day} value={index}>
              {day}
            </option>
          ))}
        </Select>
      </div>

      <div className={cn(frequency !== 'monthly' && 'hidden')}>
        <Label htmlFor="monthDay">Day of the month</Label>
        <Input id="monthDay" name="monthDay" type="number" min={1} max={31} defaultValue={schedule.monthDay} />
        <p className="mt-1 text-sm text-zinc-500">Shorter months use their last day.</p>
      </div>

      <div className={cn(frequency === 'off' && 'hidden')}>
        <Label htmlFor="time">Time</Label>
        <Input id="time" name="time" type="time" defaultValue={schedule.time} />
      </div>

      <div className={cn(frequency === 'off' && 'hidden')}>
        <Label htmlFor="folder">Save to folder</Label>
        <Input id="folder" name="folder" defaultValue={folder} placeholder={defaultFolder} />
        <p className="mt-1 text-sm text-zinc-500">
          A full path on this computer, such as D:\Backups. Leave blank to use the folder shown above.
        </p>
      </div>

      {frequency === 'every24h' && (
        <p className="text-sm text-zinc-500">The first backup runs at this time, then 24 hours after each backup.</p>
      )}
      {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? 'Saving…' : 'Save'}
      </Button>
    </form>
  )
}
