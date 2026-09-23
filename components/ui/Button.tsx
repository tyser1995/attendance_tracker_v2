import { cn } from '@/lib/utils/cn'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md'

const variants: Record<Variant, string> = {
  primary:
    'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 hover:shadow-md hover:shadow-indigo-600/30 disabled:bg-indigo-300 disabled:shadow-none',
  secondary:
    'bg-white text-zinc-700 border border-zinc-200 shadow-sm hover:bg-zinc-50 hover:border-zinc-300 disabled:text-zinc-400',
  danger:
    'bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-500 hover:shadow-md hover:shadow-red-600/30 disabled:bg-red-300 disabled:shadow-none',
  ghost: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:text-zinc-400',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
}
