# Changelog

All notable changes to this project are listed here, newest first.

## 2026-11-19

### Added

- **Import user accounts.** Super Admins can add login accounts from a JSON file under **Settings → Import User Accounts**. **Check** shows what would happen without changing anything, and **Import new accounts** then adds only the new ones. This section is currently hidden; see **Changed**.
  - **Accepted files:** a backup from this app (only its user accounts are read), `{ "users": [...] }`, or a plain list of accounts.
  - **Login details:** each account needs a `username` and either a `passwordHash` (as in backups) or a plain `password` of at least 6 characters, which is hashed before saving. `role` must be Super Admin, Admin, or Staff, and defaults to Staff.
  - **Duplicates:** usernames are matched ignoring case and surrounding spaces. An account whose username is already in the database, or appears earlier in the file, is skipped. Existing accounts are never changed.
  - **Card IDs:** a card ID already linked to another account is dropped, and the account is imported without it.
  - Accounts with missing or invalid details are counted as invalid and not added.
- **Import time logs.** Super Admins can add attendance time logs from a JSON or CSV file under **Settings → Import Time Logs**, with the same **Check** and import steps.
  - **Accepted files:** a CSV exported from **Reports** (this app's or the Flutter app's), a backup from this app or the Flutter app (only the time logs are read), `{ "attendances": [...] }`, or a plain list of logs.
  - **CSV columns** are found by their header names, in any order. Date, Student ID, Status, and Time In are required. Name (or Student Name), Time Out, Course, and Year are used when present, and other columns are ignored. A file missing a required column is refused with a message naming it.
  - **CSV values:** statuses can be labels such as "AM Time In" or numbers 1 to 4. Dates and times rewritten by a spreadsheet app, such as `10/29/2026` and `2:15:18 PM`, are converted. Quoted names containing commas are read correctly.
  - **Encoding:** files are read as UTF-8, or as Windows-1252 (Excel's default when saving CSV) when they aren't valid UTF-8, so names such as Cañal keep their ñ.
  - **Duplicates:** a student has at most one AM and one PM log per day, so a log is skipped when the same student already has one for that day and session, in the database or earlier in the file. Existing logs are never changed.
  - **Required values:** a student ID number, a real date (YYYY-MM-DD), a status from 1 to 4, and a time in. AM Out and PM Out logs also need a time out. Logs that don't meet these are counted as invalid and not added.
  - **Times:** `08:05` and `08:05:00` count as the same time.
  - **Names:** a missing name is filled in from the student list.
  - **New students:** a student ID with a valid log in the file but not in the student list is added as a student, and its logs are imported either way.
    - **Name splitting:** the full name is split into first, middle, and last name. A middle initial becomes the middle name, with a dot added. Surnames such as "Dela Cruz" stay together, suffixes such as "Jr." stay with the last name, "Last, First M." order is handled, and ALL-CAPS names are converted to normal capitals.
    - **Names without a middle initial:** these can't be split for certain. Three words become a two-word first name and a last name, and with four or more words, the second-to-last becomes the middle name.
    - **Duplicates:** each ID is added once, and deleted students count as existing. A person isn't added if another student already has the same first name, middle initial, and last name under a different ID, which usually means a mistyped ID. They're listed in the notes to check.
    - **Courses:** when the file has a Course column, the student is linked to that course by code. A course that doesn't exist is added, using its code as its name and the Year column as its year level.
    - Students are added only by **Import**, in the same step as the logs. **Check** shows how many would be added or skipped.
  - **Time out before time in:** logs whose time out is earlier than their time in, as recorded by a device with a wrong clock, are imported as recorded and listed in the notes.
- **Import results.** Both imports show how many entries are new, already exist, repeat in the file, or are invalid, with the reason for each skipped entry. When nothing can be added, the result says so.
  - Before importing, **Check** shows the date range of the new time logs.
  - After importing, a link opens the new logs in the Attendance Log, or the user list for accounts. A **View students** link appears when students were added.
  - Each import is recorded in **Logs** as "Imported users" or "Imported time logs", with the number of students added.
- **Date range on the Attendance Log.** The single date filter is now **From** and **To**, and both default to today. A **Date** column shows each log's day, and the summary line shows the number of records, students, and days with logs. Old `?date=` links still show that one day.
- **Imported logs are marked.** Time logs added by **Import Time Logs** or **Compare & Merge Backups** record when they were imported and from which file.
  - The Attendance Log has a **Source** column showing **Imported** with the import date, or **Scanned**. Hovering over **Imported** shows the file name.
  - A **Source** filter shows all logs, only scanned logs, or only imported logs.
- **Tests** for both imports, CSV reading, and name splitting.

### Changed

- **Compare & Merge Backups and Import User Accounts are hidden** from the Settings page. They still work. To show them again, set `SHOW_MERGE_BACKUPS` or `SHOW_IMPORT_USERS` to `true` in `app/(app)/settings/page.tsx`.

### Fixed

- **Browser extensions caused a hydration warning in development.** Extensions such as Grammarly add attributes to the page's `<body>` before the app loads, which React reported as a mismatch. Those differences on `<body>` are now ignored; mismatches anywhere else are still reported.

### Upgrade notes

- One new database migration, `add_attendance_import_marker`, adds the `importedAt` and `importSource` columns to attendance. Starting the app with `start-app.bat` applies it automatically. Otherwise, stop the app, then run `npx prisma migrate deploy` and `npm run db:generate` before starting it again. The bundled `data/demo-seed.db` already includes it.
- **Restart a running dev server after the migration.** A server started before it keeps using the old Prisma client, and the Attendance Log and Import Time Logs fail with "Unknown argument `importedAt`".
- Logs imported or merged before this change have no import record, so they show as **Scanned**.

### Security

- **Time log files are excluded from git.** `/timelogs/`, a folder for keeping files to import, was added to `.gitignore`, because those files contain student data.
- **Only Super Admins can import.** Both imports are checked by the server code as well as by the route guard.

## 2026-11-03

### Added

- **Rename the application.** Super Admins can change the application name under **Settings → Application Name**. The name appears in the browser tab, top bar, and login page, and can be up to 60 characters.
- **Change the logo and browser icon.** Super Admins can upload their own under **Settings → Logo & Browser Icon**, or go back to the default with **Use default**.
  - The logo appears in the top bar, the mobile menu, and on the login page, and the browser icon on the browser tab.
  - Images can be PNG, JPEG, or WebP up to 1 MB, and the browser icon can also be ICO. SVG isn't accepted.
  - They aren't included in backups, so restoring a backup doesn't change them.
- **Scheduled backups.** Super Admins can schedule automatic backups under **Settings → Scheduled Backup**, choosing every 24 hours, every day, every week, or every month.
  - **Time:** every option runs at a selected time. Weekly backups also use a selected day of the week, and monthly backups a selected day of the month. Shorter months use their last day. Every 24 hours starts at the selected time, then repeats 24 hours after each backup.
  - **Save location:** backups go to a selected folder, which is created and write-tested when the schedule is saved. If no folder is chosen, they use `BACKUP_DIR`, then a `backups/` folder in the project.
  - **Status:** Settings shows the last backup, the next backup, the folder, and any error from the last attempt.
  - **Missed backups:** backups only run while the app is running. A backup missed while it was closed runs once the next time it starts.
  - **Restoring:** scheduled backup files use the same format as a manual export, so **Restore from Backup** accepts them.
- **Loading indicators.** A spinner appears while a page loads, with the sidebar and top bar staying in place. The clicked menu link and the **Filter** and **Apply** buttons also show a spinner while waiting.
- **Course and Year in report exports.** CSV and PDF exports now have the columns Date, Student ID, Name, Course, Year, Status, Time In, and Time Out. Course and Year are found using the student's ID, and stay blank if the ID has no matching student.
- **Restore backups from the Flutter app.** **Restore from Backup** now converts the older Flutter format, including courses, students, attendance, and ID patterns. User accounts and settings are kept, because those backups don't contain them.
- **Start without an editor.**
  - `start-app.bat` starts the app and opens the browser in one click. If the app is already running, it only opens the browser.
  - Each time it starts the app, `start-app.bat` prepares the computer automatically, so a fresh clone or a `git pull` needs no manual steps. It creates `.env` and `.env.local` with a new `AUTH_SECRET`, installs packages when they've changed, applies database migrations without resetting data, and regenerates the Prisma client.
  - Default accounts are only created in a database with no users, so a deleted default account doesn't come back.
  - `install-autostart.bat` makes the app start and open each time the user signs in to Windows.
  - `remove-autostart.bat` turns auto-start off.
- **Compare and merge backups.** **Settings → Compare & Merge Backups** accepts several backup files at once. **Compare** reports, per file and table, what's new, what already exists, and what exists with different values, without changing anything. **Merge new records** then adds only the missing records.
  - Existing records are never changed or deleted.
  - New ID patterns are added as inactive, so they can't start rejecting scans.
  - User accounts are compared but never added, so an old backup can't bring back a deleted account.
  - Records are matched by course code, student ID number, and ID pattern text. Attendance is matched by record ID, or by the same person, date, and time in. Merging the same file again adds nothing.
  - Settings in a backup file are ignored, and records with missing or impossible values are counted as invalid and skipped.
  - Files are processed one at a time, with a 9.5 MB limit per file. If one file fails, nothing is added from that file.
- **Logs page.** A new Super Admin page at `/logs` shows today's totals, with filters and a 15-second auto-refresh.
  - **User Activity:** pages opened, buttons and links clicked, sign-ins, failed sign-ins, sign-outs, and backup restores and merges.
  - **Errors:** errors from the server, browsers, and scheduled backups.
  - Logs are kept for 90 days and aren't included in backups.
  - Text typed into fields isn't recorded, though link and button labels are. Activity is only recorded for signed-in users, so visitors to the public Time Log aren't tracked.
- **Error page.** If a page fails, users see a message with a **Try again** button instead of a blank error.
- **Tests** for backup restore and merge, the backup schedule, settings validation, and report exports.

### Changed

- **Backup upload limit** raised from 1 MB to 10 MB, so larger backup files can be restored.
- **Restore only replaces tables included in the backup file.** Tables the file doesn't include are left as they are.
- **Filter and Apply no longer reload the whole page** on the Attendance Log and Reports pages.
- **Every page now renders on request** rather than being prerendered, so a new application name appears everywhere, including the login page.
- **Default browser icon** moved from `app/favicon.ico` to `public/favicon.ico`, because the old location would override an uploaded icon.
- **README** updated to describe the new Settings features and the Logs page.

### Fixed

- **Restoring an unrecognized file could delete all data, including every login.** These files are now refused before anything is deleted, with the message "Unrecognized backup format. Nothing was changed."
- **Restoring a backup with an empty user list could lock everyone out.** These files are now refused as well.
- **The app crashed on a new computer with "table does not exist".** A cloned repo has no database, because `prisma/dev.db` is not stored in git, and nothing applied the migrations. `start-app.bat` now does this automatically.

### Security

- **Scheduled backup files are excluded from git.** They contain password hashes and student data, so `/backups/` was added to `.gitignore`. A folder chosen outside the project isn't covered by this, so keep it private.
- **Server-side role checks.** Changing the application name or backup schedule, comparing or merging backups, and viewing the Logs page require a Super Admin, checked by the server code itself as well as by the route guard.
- **Safe image uploads.** Only a Super Admin can change the logo or browser icon. The file type is read from the image's contents rather than its name, and SVG files are rejected because they can contain scripts.
- **Protected log recording.** `/api/logs` only accepts signed-in users and limits the size of each request. The username and role are taken from the session, so a browser can't record activity as someone else or fake a sign-in.

### Upgrade notes

- Five new database migrations add the application name, backup settings, logs, and branding images. Starting the app with `start-app.bat` applies them automatically. Otherwise, stop the app, then run `npx prisma migrate deploy` and `npm run db:generate` before starting it again. The bundled `data/demo-seed.db` already includes them.
- The migrations are written for SQLite, so they need adapting before use on Postgres.
- Scheduled backups need a server that keeps running, so they won't run on serverless hosting such as Vercel.

## 2026-09-23

### Added

- **Version 2: Next.js rewrite** of the Flutter attendance tracker (Phase 1).
- **Time Log:** enter or scan a student ID to record AM In, AM Out, PM In, and PM Out each day. A fifth scan on the same day is rejected.
- **Attendance Log** with date filtering, and a **Dashboard** with daily present and absent counts, AM and PM totals, and an attendance-rate chart.
- **Management pages** for students, courses, ID patterns, and user accounts.
- **Reports** for a date range, with a daily chart, per-student log counts, and CSV and PDF export.
- **Settings** for choosing the initial page, plus full JSON backup export and restore.
- **Role-based access** for Super Admin, Admin, and Staff, with next-auth login.
- **Database support** through Prisma: SQLite locally and Postgres in production, selected by `DATABASE_URL`.

## 2026-09-17

### Added

- Initial repository setup with `README.md` and `.gitignore`.
