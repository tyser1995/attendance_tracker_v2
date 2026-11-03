import Image from 'next/image'
import { CalendarCheck2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

// Shows the uploaded logo, or the default icon if there isn't one.
export function AppLogo({
  logoUrl,
  size = 28,
  className,
}: {
  logoUrl: string | null
  size?: number
  className?: string
}) {
  const box = { width: size, height: size }

  if (logoUrl) {
    return (
      <span className={cn('flex shrink-0 items-center justify-center overflow-hidden', className)} style={box}>
        <Image src={logoUrl} alt="" width={size} height={size} unoptimized className="h-full w-full object-contain" />
      </span>
    )
  }

  return (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-600/30', className)}
      style={box}
    >
      <CalendarCheck2 size={Math.round(size * 0.57)} />
    </span>
  )
}
