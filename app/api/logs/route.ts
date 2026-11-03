import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma/client'
import { clientLogsSchema } from '@/lib/validation/logs'

const MAX_BODY_BYTES = 256 * 1024

// Signed-in users only, so anyone reaching the public Time Log can't fill the database.
// The proxy skips /api routes, so this check is the only guard here.
export async function POST(request: Request) {
  const session = await auth()
  if (!session) return new NextResponse(null, { status: 401 })

  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new NextResponse(null, { status: 400 })
  }

  const parsed = clientLogsSchema.safeParse(body)
  if (!parsed.success) return new NextResponse(null, { status: 400 })

  const { username, role } = session.user
  const { activity, errors } = parsed.data
  if (activity.length) {
    await prisma.activityLog.createMany({ data: activity.map((entry) => ({ ...entry, username, role })) })
  }
  if (errors.length) {
    await prisma.errorLog.createMany({ data: errors.map((entry) => ({ ...entry, source: 'browser', username })) })
  }

  return new NextResponse(null, { status: 204 })
}
