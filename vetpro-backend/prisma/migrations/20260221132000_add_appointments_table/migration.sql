CREATE TABLE "Appointment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "time" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'consulta',
  "status" TEXT NOT NULL DEFAULT 'agendado',
  "linkedConsultationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Appointment_userId_date_idx" ON "Appointment"("userId", "date");
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");
