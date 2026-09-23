import Link from 'next/link'
import { prisma } from '@/lib/prisma/client'
import { auth } from '@/auth'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DataTable, type DataTableRow } from '@/components/ui/DataTable'
import { EditAction, DeleteAction } from '@/components/ui/RowActions'
import { deleteUser } from './actions'

const ROLE_LABEL: Record<string, string> = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', STAFF: 'Staff' }
const ROLE_COLOR = { SUPER_ADMIN: 'indigo', ADMIN: 'blue', STAFF: 'zinc' } as const

const COLUMNS = [
  { key: 'username', label: 'Username', sortable: true },
  { key: 'role', label: 'Role', sortable: true },
]

export default async function UsersPage() {
  const [users, session] = await Promise.all([prisma.user.findMany({ orderBy: { username: 'asc' } }), auth()])

  const rows: DataTableRow[] = users.map((u) => ({
    key: u.id,
    searchText: `${u.username} ${ROLE_LABEL[u.role]}`,
    sortValues: { username: u.username, role: u.role },
    cells: {
      username: <span className="text-zinc-900">{u.username}</span>,
      role: <Badge color={ROLE_COLOR[u.role]}>{ROLE_LABEL[u.role]}</Badge>,
    },
    actions: (
      <>
        <EditAction href={`/users/${u.id}/edit`} />
        {u.id !== session?.user.id && (
          <DeleteAction
            action={deleteUser.bind(null, u.id)}
            confirmMessage={`Delete user '${u.username}'?`}
          />
        )}
      </>
    ),
  }))

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">User Management</h1>
        <Link href="/users/new">
          <Button>Add User</Button>
        </Link>
      </div>

      <DataTable
        columns={COLUMNS}
        rows={rows}
        hasActions
        searchPlaceholder="Search by username or role…"
        emptyMessage="No users found."
        defaultSortKey="username"
      />
    </div>
  )
}
