-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "initialPage" TEXT NOT NULL DEFAULT 'login',
    "appName" TEXT NOT NULL DEFAULT 'Attendance Tracker',
    "backupFrequency" TEXT NOT NULL DEFAULT 'off',
    "backupTime" TEXT NOT NULL DEFAULT '18:00',
    "backupWeekday" INTEGER NOT NULL DEFAULT 1,
    "backupMonthDay" INTEGER NOT NULL DEFAULT 1,
    "nextBackupAt" DATETIME,
    "lastBackupAt" DATETIME,
    "lastBackupError" TEXT
);
INSERT INTO "new_settings" ("appName", "id", "initialPage") SELECT "appName", "id", "initialPage" FROM "settings";
DROP TABLE "settings";
ALTER TABLE "new_settings" RENAME TO "settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

