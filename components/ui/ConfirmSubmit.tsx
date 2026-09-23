'use client'

import { Button } from './Button'
import type { ComponentProps } from 'react'

export function ConfirmSubmit({
  confirmMessage,
  children,
  ...props
}: ComponentProps<typeof Button> & { confirmMessage: string }) {
  return (
    <Button
      type="submit"
      onClick={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault()
      }}
      {...props}
    >
      {children}
    </Button>
  )
}
