/*
  Warnings:

  - You are about to drop the column `anamnese` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `avaliacaoClinica` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `conduta` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `motivoRetorno` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `observacoes` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `queixaPrincipal` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `speciesGroup` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `speciesType` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `tutorName` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `signatureUrl` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,numeroProntuario]` on the table `Consultation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `diagnosis` to the `Consultation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerName` to the `Patient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `specie` to the `Patient` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Consultation" DROP COLUMN "anamnese",
DROP COLUMN "avaliacaoClinica",
DROP COLUMN "conduta",
DROP COLUMN "date",
DROP COLUMN "motivoRetorno",
DROP COLUMN "observacoes",
DROP COLUMN "queixaPrincipal",
ADD COLUMN     "diagnosis" TEXT NOT NULL,
ADD COLUMN     "treatment" TEXT;

-- AlterTable
ALTER TABLE "Patient" DROP COLUMN "speciesGroup",
DROP COLUMN "speciesType",
DROP COLUMN "tutorName",
ADD COLUMN     "ownerName" TEXT NOT NULL,
ADD COLUMN     "ownerPhone" TEXT,
ADD COLUMN     "specie" TEXT NOT NULL,
ADD COLUMN     "weight" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "signatureUrl";

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_userId_numeroProntuario_key" ON "Consultation"("userId", "numeroProntuario");
