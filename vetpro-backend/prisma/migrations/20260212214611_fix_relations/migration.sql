/*
  Warnings:

  - You are about to drop the column `clinicName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "address" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "clinicName",
DROP COLUMN "createdAt";
