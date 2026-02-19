-- CreateTable
CREATE TABLE "ConsultationFile" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consultationId" TEXT NOT NULL,

    CONSTRAINT "ConsultationFile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ConsultationFile" ADD CONSTRAINT "ConsultationFile_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
