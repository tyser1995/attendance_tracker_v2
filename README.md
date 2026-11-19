# Attendance Tracker v2

Next.js rewrite of [`attendance_tracker`](https://github.com/tyser1995/attendance_tracker) (Flutter). A web app for tracking student attendance — dual-session (AM/PM) time logging by ID entry, role-based access control, and a single Postgres/SQLite backend via Prisma.

This is **Phase 1** — the core workflow. See [Not yet ported](#not-yet-ported-from-the-flutter-app-phase-2) for what the Flutter app has that this version doesn't yet.

---

## Features

| Feature | Description |
|---|---|
| **Time Log** (`/scanner`) | Type or scan a student ID, press Enter. Auto-advances AM In → AM Out → PM In → PM Out each day; rejects a 5th scan for the same day. |
| **Attendance Log** (`/attendance`) | Browse attendance records by date range (From/To, default today), and by source: scanned or imported. Imported logs show when and from which file they were imported. |
| **Dashboard** (`/dashboard`) | Today's present/absent counts, AM/PM totals, attendance-rate chart. |
| **Students** (`/students`) | Add, edit, soft-delete student profiles. Duplicate ID number is rejected. |
| **Courses** (`/courses`) | Manage the course catalogue (code, name, year level). Duplicate course code is rejected; a course with active students can't be deleted. |
| **ID Patterns** (`/patterns`) | Define allowed ID formats using mask syntax (e.g. `##-#####-#`, `#` = digit). Scanned IDs are checked against every active pattern. |
| **Reports** (`/reports`) | Date-range report (defaults to today). Bar chart of logs per day, per-student log counts in a paginated table (10 rows/page), CSV and PDF export. |
| **User Management** (`/users`) | Super admin can create, edit, and delete accounts and assign roles. At least one Super Admin is always kept. |
| **Logs** (`/logs`) | Super admin can monitor pages opened, buttons and links clicked, sign-ins, and errors. Kept for 90 days. |
| **Settings** (`/settings`) | Rename the application, change the logo and browser icon, schedule automatic backups (every 24 hours, day, week, or month, at a chosen time and to a chosen folder), choose the initial page (Login or public Scanner), export/restore a full JSON backup (also accepts backups from the Flutter app), and [import time logs](#importing-user-accounts-and-time-logs) from a Reports CSV or JSON file, skipping duplicates and adding missing students. Comparing and merging backups and importing user accounts are available but currently hidden. |

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
| Testing | Vitest (unit tests for the attendance state machine, ID-pattern regex builder, backups, merging, and imports) |

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
│   ├── backup/merge.ts         # Compare & merge backups
│   ├── backup/importUsers.ts   # Import user accounts from JSON
│   ├── backup/importAttendance.ts  # Import time logs (JSON or CSV), adding missing students
│   ├── backup/csv.ts           # CSV reader and file encoding detection
│   ├── students/parseName.ts   # Split full names into first, middle, last
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

## Importing user accounts and time logs

**Settings → Import Time Logs** and **Settings → Import User Accounts** add records from a file without changing what's already there. Choose a file, click **Check** to see what's new, then click **Import**. After importing, the result links to the new records.

> **Import User Accounts** and **Compare & Merge Backups** are currently hidden from Settings. They still work; to show them, set `SHOW_IMPORT_USERS` or `SHOW_MERGE_BACKUPS` to `true` in `app/(app)/settings/page.tsx`.

| | Time logs | User accounts |
|---|---|---|
| **Accepted files** | A CSV exported from **Reports** (this app or the Flutter app), a backup from this app or the Flutter app, `{ "attendances": [...] }`, or a plain list | A backup from this app, `{ "users": [...] }`, or a plain list |
| **Required fields** | CSV: `Date`, `Student ID`, `Status`, `Time In` columns. JSON: `idNumber`, `createdDate` (YYYY-MM-DD), `status` (1–4), `timeIn` (HH:MM:SS). AM Out and PM Out logs also need a time out. | `username`, plus `passwordHash` (bcrypt) or `password` (6+ characters, hashed on import). `role` defaults to `STAFF`. |
| **Skipped as duplicates** | A log for a student, day, and session (AM or PM) that already exists or appears earlier in the file | A username already in the database or earlier in the file, ignoring case |

### Time logs from a CSV

Columns are matched by header name in any order, so both Reports exports work:

```csv
Date,Student ID,Student Name,Status,Time In,Time Out
2026-10-28,KAG02152005,"Kiny A. Gonzales",AM Time Out,08:39:42,11:02:09
2026-10-29,DSC01212008,"Derence S. Contreras",AM Time In,14:15:18,
```

- **Status** can be a label (`AM Time In`, `AM Time Out`, `PM Time In`, `PM Time Out`) or a number 1–4.
- **Name** (or **Student Name**), **Time Out**, **Course**, and **Year** are used when present. Other columns are ignored.
- **Dates and times re-saved by a spreadsheet app**, such as `10/29/2026` or `2:15:18 PM`, are converted.
- **Encoding:** UTF-8 and Excel's default Windows-1252 are both read correctly, so names like *Cañal* keep their ñ.

### New students from imported logs

A student ID that has a valid log in the file but isn't in the student list is added as a student when you click **Import**. **Check** shows how many would be added or skipped first.

- **Name splitting:** the full name is split into first, middle, and last name, for example `MJ Strong C. Palacios` → *MJ Strong* / *C.* / *Palacios*, or `Mary Ann G Delos Reyes` → *Mary Ann* / *G.* / *Delos Reyes*. Surnames like *Dela Cruz* stay together, *Jr.* stays with the last name, `Last, First M.` order is handled, and ALL-CAPS names are converted to normal capitals.
- **Names without a middle initial** are a best guess. Three words become a two-word first name and a last name, and with four or more words, the second-to-last is the middle name.
- **Duplicates:** each ID is added once, and deleted students count as existing. Someone isn't added if a student with the same first name, middle initial, and last name already exists under another ID, which usually means the ID was mistyped. They appear under **Show skipped records and notes**, and their logs are still imported under the file's ID.
- **Course:** with a Course column, the student is linked to that course by code. A missing course is created, using the code as its name.

Example JSON time log file:

```json
[
  { "idNumber": "21-00123-4", "createdDate": "2026-08-26", "status": 2, "timeIn": "08:31:42", "timeOut": "10:51:57" }
]
```

Imported time logs are marked with when they were imported and from which file. To see them, open the Attendance Log, set **Source** to **Imported**, and choose a date range. Files kept in a `timelogs/` folder in the project are ignored by git.

---

## Not yet ported from the Flutter app (Phase 2)

- RFID/barcode, QR code, and face-recognition login methods, and the credential-assignment UI (`User.cardId` / `User.faceDescriptor` columns already exist in the schema for this)
- Trial mode
- Excel export
- Public `/presentation` slide deck
- In-app runtime database backend switching (this version fixes the backend at deploy time via `DATABASE_URL` instead)

## License

MIT
