/*
  Warnings:

  - Added the required column `clinicId` to the `Consultation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Consultation" ADD COLUMN     "clinicId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
