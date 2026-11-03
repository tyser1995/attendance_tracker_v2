// Prepares the app to start, and is safe to run every time. start-app.bat runs it so a
// fresh clone or a `git pull` works without any manual steps. Nothing here resets or
// removes data.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execSync } = require('child_process')

const root = path.join(__dirname, '..')
const file = (name) => path.join(root, name)
const PLACEHOLDER_SECRET = 'replace_with_a_random_32_byte_secret'

function run(command) {
  execSync(command, { cwd: root, stdio: 'inherit', env: process.env })
}

// The app reads .env.local and .env, but Prisma's commands only read .env, so both must exist.
function ensureEnvFiles() {
  const hasLocal = fs.existsSync(file('.env.local'))
  const hasEnv = fs.existsSync(file('.env'))

  if (hasLocal && !hasEnv) fs.copyFileSync(file('.env.local'), file('.env'))
  else if (hasEnv && !hasLocal) fs.copyFileSync(file('.env'), file('.env.local'))
  else if (!hasLocal && !hasEnv) {
    console.log('First run: creating .env.local and .env')
    fs.copyFileSync(file('.env.example'), file('.env.local'))
    fs.copyFileSync(file('.env.example'), file('.env'))
  }

  const secret = crypto.randomBytes(32).toString('base64')
  for (const name of ['.env.local', '.env']) {
    const contents = fs.readFileSync(file(name), 'utf8')
    if (contents.includes(PLACEHOLDER_SECRET)) {
      fs.writeFileSync(file(name), contents.replace(PLACEHOLDER_SECRET, secret))
    }
  }
}

// npm records what it installed in node_modules/.package-lock.json, so a package-lock.json
// newer than that means a pull changed the dependencies.
function ensurePackages() {
  const installed = file('node_modules/.package-lock.json')
  const upToDate =
    fs.existsSync(installed) && fs.statSync(installed).mtimeMs >= fs.statSync(file('package-lock.json')).mtimeMs
  if (upToDate) return

  console.log('Installing packages. The first time can take several minutes...')
  // npm ci installs exactly what the lock file lists, and unlike npm install never rewrites
  // it, so this doesn't leave an uncommitted change on every computer.
  run('npm ci')
}

function loadEnv() {
  const dotenv = require(file('node_modules/dotenv'))
  dotenv.config({ path: file('.env.local'), quiet: true })
  dotenv.config({ path: file('.env'), quiet: true })
}

// Default accounts are only created in a database with no users. Seeding on every start
// would bring back a deleted default account, with its default password.
function seedIfEmpty(databaseUrl) {
  const databasePath = path.resolve(root, databaseUrl.slice('file:'.length))
  const Database = require(file('node_modules/better-sqlite3'))
  const db = new Database(databasePath, { readonly: true })
  const { count } = db.prepare('select count(*) as count from users').get()
  db.close()
  if (count > 0) return

  console.log('New database: creating the default accounts')
  run('npm run db:seed')
  console.log('\nDefault accounts created. Change their passwords in User Management.\n')
}

function main() {
  ensureEnvFiles()
  ensurePackages()
  loadEnv()

  const databaseUrl = process.env.DATABASE_URL ?? ''
  if (databaseUrl.startsWith('file:')) {
    run('npx prisma migrate deploy')
    run('node scripts/prisma-provider.js')
    seedIfEmpty(databaseUrl)
  } else {
    // The migrations are written for SQLite, so a Postgres database is left to be managed by hand.
    console.log('DATABASE_URL is not a local SQLite file, so database setup was skipped.')
    run('node scripts/prisma-provider.js')
  }
}

try {
  main()
} catch (err) {
  console.error(`\nSetup failed: ${err.message}`)
  process.exit(1)
}
