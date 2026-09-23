import { UserForm } from '@/components/users/UserForm'
import { createUser } from '../actions'

export default function NewUserPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Add User</h1>
      <UserForm action={createUser} mode="create" />
    </div>
  )
}
