/*
  Warnings:

  - You are about to drop the `Rol` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Rol";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RolPermission" (
    "rolId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    PRIMARY KEY ("rolId", "permissionId"),
    CONSTRAINT "RolPermission_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RolPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RolPermission" ("permissionId", "rolId") SELECT "permissionId", "rolId" FROM "RolPermission";
DROP TABLE "RolPermission";
ALTER TABLE "new_RolPermission" RENAME TO "RolPermission";
CREATE TABLE "new_UserRol" (
    "userId" TEXT NOT NULL,
    "rolId" TEXT NOT NULL,

    PRIMARY KEY ("userId", "rolId"),
    CONSTRAINT "UserRol_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserRol_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserRol" ("rolId", "userId") SELECT "rolId", "userId" FROM "UserRol";
DROP TABLE "UserRol";
ALTER TABLE "new_UserRol" RENAME TO "UserRol";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
