-- AlterTable
ALTER TABLE "player_photos" ADD COLUMN "credential_key" TEXT;
ALTER TABLE "player_photos" ADD COLUMN "visibility" VARCHAR(20) NOT NULL DEFAULT 'private';

-- Preservar visualización de fotografías ya existentes (cargadas antes del control de privacidad).
UPDATE "player_photos" SET "visibility" = 'public';
