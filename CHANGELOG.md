# Changelog

All notable changes to this project are listed here, newest first.

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
