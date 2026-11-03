# Attendance Tracker v2

Next.js rewrite of [`attendance_tracker`](https://github.com/tyser1995/attendance_tracker) (Flutter). A web app for tracking student attendance — dual-session (AM/PM) time logging by ID entry, role-based access control, and a single Postgres/SQLite backend via Prisma.

This is **Phase 1** — the core workflow. See [Not yet ported](#not-yet-ported-from-the-flutter-app-phase-2) for what the Flutter app has that this version doesn't yet.

---

## Features

| Feature | Description |
|---|---|
| **Time Log** (`/scanner`) | Type or scan a student ID, press Enter. Auto-advances AM In → AM Out → PM In → PM Out each day; rejects a 5th scan for the same day. |
| **Attendance Log** (`/attendance`) | Browse attendance records, filter by date. |
| **Dashboard** (`/dashboard`) | Today's present/absent counts, AM/PM totals, attendance-rate chart. |
| **Students** (`/students`) | Add, edit, soft-delete student profiles. Duplicate ID number is rejected. |
| **Courses** (`/courses`) | Manage the course catalogue (code, name, year level). Duplicate course code is rejected; a course with active students can't be deleted. |
| **ID Patterns** (`/patterns`) | Define allowed ID formats using mask syntax (e.g. `##-#####-#`, `#` = digit). Scanned IDs are checked against every active pattern. |
| **Reports** (`/reports`) | Date-range report (defaults to today). Bar chart of logs per day, per-student log counts in a paginated table (10 rows/page), CSV and PDF export. |
| **User Management** (`/users`) | Super admin can create, edit, and delete accounts and assign roles. At least one Super Admin is always kept. |
| **Logs** (`/logs`) | Super admin can monitor pages opened, buttons and links clicked, sign-ins, and errors. Kept for 90 days. |
| **Settings** (`/settings`) | Rename the application, change the logo and browser icon, schedule automatic backups (every 24 hours, day, week, or month, at a chosen time and to a chosen folder), choose the initial page (Login or public Scanner), export/restore a full JSON backup (also accepts backups from the Flutter app), compare and merge several backups without overwriting existing data. |

## Role-Based Access

| Route | Super Admin | Admin | Staff |
|---|:---:|:---:|:---:|
| `/scanner`, `/attendance`, `/dashboard` | ✓ | ✓ | ✓ |
| `/students`, `/courses`, `/patterns`, `/reports` | ✓ | ✓ | — |
| `/users`, `/settings`, `/logs` | ✓ | — | — |

Enforced both in `proxy.ts` (route guard) and in each page/Server Action.

## Default Accounts

Seeded by `npm run db:seed`:

| Username | Password | Role |
|---|---|---|
| `superadmin` | `superadmin123` | Super Admin |
| `admin` | `admin123` | Admin |
| `staff` | `staff123` | Staff |

> Change default passwords after first login via **User Management**.

---

## Tech Stack

| Layer | Library / Tool |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript |
| Database | Prisma 7 — SQLite locally, Postgres (Supabase) in production, switched by `DATABASE_URL` |
| Auth | next-auth v5 (Credentials provider), bcryptjs |
| Styling | Tailwind CSS v4 |
| Forms | react-hook-form-style Server Actions + zod validation |
| Charts | Recharts |
| Export | jsPDF + jspdf-autotable (PDF), hand-rolled CSV |
| Testing | Vitest (unit tests for the attendance state machine and ID-pattern regex builder) |

## Project Structure

```
attendance_tracker_v2/
├── app/
│   ├── login/                  # Public login page + Server Action
│   ├── (app)/                  # Authenticated shell (sidebar + topbar)
│   │   ├── scanner/            # Time Log
│   │   ├── attendance/
│   │   ├── dashboard/
│   │   ├── students/ courses/ patterns/ reports/ users/ settings/
│   ├── api/auth/[...nextauth]/ # next-auth route handler
│   └── generated/prisma/       # Generated Prisma client (gitignored)
├── auth.ts                     # next-auth config (Credentials provider)
├── proxy.ts                    # Route guard (Next.js 16 "proxy", replaces middleware.ts)
├── components/                 # UI primitives + feature components
├── lib/
│   ├── prisma/client.ts        # Driver-adapter singleton (SQLite / Postgres)
│   ├── auth/                   # Password hashing, role helpers
│   ├── attendance/logAttendance.ts  # Ported AM/PM state machine
│   ├── idPattern/buildRegex.ts # Mask -> regex converter
│   ├── backup/backup.ts        # Full JSON export/import
│   └── validation/             # zod schemas
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── scripts/prisma-provider.js  # Rewrites schema provider to match DATABASE_URL before generate
└── tests/                      # Vitest unit tests
```

---

## Getting Started

**On Windows, double-click `start-app.bat`.** It creates the settings files, installs packages, sets up the database, creates the default accounts in a new database, and opens the app in your browser. The first run can take several minutes. Your data isn't stored in git, so to bring it to another computer, copy `prisma/dev.db` or use **Export Backup** and **Restore from Backup**.

To set it up by hand instead, follow these steps.

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Local dev defaults to SQLite (`DATABASE_URL="file:./prisma/dev.db"`) — no server needed. Generate an `AUTH_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> The Prisma CLI reads plain `.env` (not `.env.local`) — keep both in sync locally, e.g. `cp .env.local .env`.

### 3. Set up the database

```bash
npm run db:generate   # generate the Prisma client for the current DATABASE_URL
npm run db:migrate    # create/apply migrations (SQLite: creates prisma/dev.db)
npm run db:seed       # seed the 3 default accounts
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (Next.js picks the next free port if 3000 is taken).

---

## Switching to Postgres / Supabase in production

Set `DATABASE_URL` to a Postgres connection string (e.g. from Supabase) and re-run `npm run db:generate` (also wired into `postinstall` and `build`) — it rewrites `prisma/schema.prisma`'s datasource provider to match, then regenerates the client. Run `npm run db:migrate:prod` against that database once.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Regenerate Prisma client for `DATABASE_URL`, then production build |
| `npm run db:generate` | Regenerate Prisma client (rewrites datasource provider first) |
| `npm run db:migrate` | Create/apply a dev migration |
| `npm run db:migrate:prod` | Apply migrations in production |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run db:seed` | Seed the default accounts |
| `npm test` | Run Vitest unit tests |

---

## Attendance Status Reference

| Status | Label |
|---|---|
| 1 | AM Time In |
| 2 | AM Time Out |
| 3 | PM Time In |
| 4 | PM Time Out |

Each scan advances the current day's status by one; a 5th scan in the same day is rejected. Ported 1:1 from the Flutter app's `attendanceLogic.js` state machine — see `lib/attendance/logAttendance.ts`.

---

## Not yet ported from the Flutter app (Phase 2)

- RFID/barcode, QR code, and face-recognition login methods, and the credential-assignment UI (`User.cardId` / `User.faceDescriptor` columns already exist in the schema for this)
- Scheduled automatic backups
- Trial mode
- Excel export, CSV attendance import
- Public `/presentation` slide deck
- In-app runtime database backend switching (this version fixes the backend at deploy time via `DATABASE_URL` instead)

## License

MIT
