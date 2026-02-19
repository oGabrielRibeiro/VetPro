-- AlterTable
ALTER TABLE "Consultation" ADD COLUMN     "anamnesis" TEXT,
ADD COLUMN     "chiefComplaint" TEXT,
ADD COLUMN     "consultationType" TEXT,
ADD COLUMN     "heartRate" INTEGER,
ADD COLUMN     "medications" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "physicalExam" TEXT,
ADD COLUMN     "previousConsultationId" TEXT,
ADD COLUMN     "procedures" TEXT,
ADD COLUMN     "respiratoryRate" INTEGER,
ADD COLUMN     "returnRecommendation" TEXT,
ADD COLUMN     "temperature" DOUBLE PRECISION,
ADD COLUMN     "vaccinationUpToDate" BOOLEAN,
ADD COLUMN     "veterinarianCrmv" TEXT,
ADD COLUMN     "veterinarianName" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION,
ALTER COLUMN "diagnosis" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_previousConsultationId_fkey" FOREIGN KEY ("previousConsultationId") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
