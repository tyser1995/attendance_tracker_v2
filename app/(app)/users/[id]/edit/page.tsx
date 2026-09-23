import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma/client'
import { UserForm } from '@/components/users/UserForm'
import { updateUser } from '../../actions'

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) notFound()

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Edit User</h1>
      <UserForm action={updateUser.bind(null, id)} mode="edit" defaultValues={{ username: user.username, role: user.role }} />
    </div>
  )
}
