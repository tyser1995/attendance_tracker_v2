-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "initialPage" TEXT NOT NULL DEFAULT 'login',
    "appName" TEXT NOT NULL DEFAULT 'Attendance Tracker'
);
INSERT INTO "new_settings" ("id", "initialPage") SELECT "id", "initialPage" FROM "settings";
DROP TABLE "settings";
ALTER TABLE "new_settings" RENAME TO "settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

