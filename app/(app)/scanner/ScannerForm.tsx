'use client'

import { useRef, useState, useTransition } from 'react'
import { scanIdAction, type ScanResult } from './actions'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils/cn'

export function ScannerForm() {
  const [value, setValue] = useState('')
  const [last, setLast] = useState<ScanResult | null>(null)
  const [history, setHistory] = useState<ScanResult[]>([])
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function submit() {
    const idNumber = value
    if (!idNumber.trim()) return
    setValue('')
    startTransition(async () => {
      const result = await scanIdAction(idNumber)
      setLast(result)
      setHistory((h) => [result, ...h].slice(0, 8))
      inputRef.current?.focus()
    })
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Input
          ref={inputRef}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="Scan or type student ID, then press Enter"
          className="h-14 text-center text-lg"
          disabled={isPending}
        />
      </div>

      {last && (
        <div
          className={cn(
            'rounded-lg border p-4 text-center',
            last.success ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
          )}
        >
          {last.success ? (
            <>
              <p className="text-lg font-semibold text-emerald-800">{last.name}</p>
              <p className="text-emerald-700">
                {last.statusLabel} — {last.time}
              </p>
            </>
          ) : (
            <p className="font-medium text-red-700">{last.message}</p>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-zinc-500">Recent scans</h2>
          <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
            {history.map((r, i) => (
              <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className={r.success ? 'text-zinc-900' : 'text-red-600'}>
                  {r.success ? r.name : r.message}
                </span>
                {r.success && <span className="text-zinc-500">{r.statusLabel}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
