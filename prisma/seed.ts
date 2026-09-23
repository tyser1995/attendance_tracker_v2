import { prisma } from '../lib/prisma/client'
import { hashPassword } from '../lib/auth/password'

async function main() {
  const accounts = [
    { username: 'superadmin', password: 'superadmin123', role: 'SUPER_ADMIN' as const },
    { username: 'admin', password: 'admin123', role: 'ADMIN' as const },
    { username: 'staff', password: 'staff123', role: 'STAFF' as const },
  ]

  for (const account of accounts) {
    const existing = await prisma.user.findUnique({ where: { username: account.username } })
    if (existing) {
      console.log(`Skipping existing user: ${account.username}`)
      continue
    }
    await prisma.user.create({
      data: {
        username: account.username,
        passwordHash: await hashPassword(account.password),
        role: account.role,
      },
    })
    console.log(`Created user: ${account.username} (${account.role})`)
  }

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, initialPage: 'scanner' },
  })

  console.log('Seed complete.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
