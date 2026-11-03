-- CreateTable
CREATE TABLE "branding_assets" (
    "kind" TEXT NOT NULL PRIMARY KEY,
    "mimeType" TEXT NOT NULL,
    "data" BLOB NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

