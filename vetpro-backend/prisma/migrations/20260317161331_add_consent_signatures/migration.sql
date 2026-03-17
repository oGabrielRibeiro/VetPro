-- AlterTable
ALTER TABLE "Consultation" ADD COLUMN     "customFormData" JSONB;

-- CreateTable
CREATE TABLE "ConsentSignature" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedByUserId" TEXT NOT NULL,
    "capturedByName" TEXT,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "consultationId" TEXT NOT NULL,

    CONSTRAINT "ConsentSignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsentSignature_consultationId_idx" ON "ConsentSignature"("consultationId");

-- CreateIndex
CREATE INDEX "ConsentSignature_clinicId_idx" ON "ConsentSignature"("clinicId");

-- CreateIndex
CREATE INDEX "ConsentSignature_patientId_idx" ON "ConsentSignature"("patientId");

-- AddForeignKey
ALTER TABLE "ConsentSignature" ADD CONSTRAINT "ConsentSignature_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

