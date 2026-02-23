ALTER TABLE "Patient"
ADD COLUMN IF NOT EXISTS "persistentProfile" JSONB;
