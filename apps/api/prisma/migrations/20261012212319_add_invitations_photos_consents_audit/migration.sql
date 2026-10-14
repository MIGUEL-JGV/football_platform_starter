-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('active', 'revoked', 'exhausted');

-- AlterTable
ALTER TABLE "tournament_teams" ADD COLUMN     "category_label" VARCHAR(80),
ADD COLUMN     "invitation_id" UUID,
ADD COLUMN     "representative_email" VARCHAR(320),
ADD COLUMN     "representative_name" VARCHAR(150),
ADD COLUMN     "representative_phone" VARCHAR(40),
ADD COLUMN     "review_note" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMPTZ,
ADD COLUMN     "reviewed_by" UUID,
ADD COLUMN     "submitted_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN     "category_label" VARCHAR(80),
ADD COLUMN     "competition_format" VARCHAR(30),
ADD COLUMN     "location" VARCHAR(180),
ADD COLUMN     "max_age" SMALLINT,
ADD COLUMN     "min_age" SMALLINT,
ADD COLUMN     "registration_requirements" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "tournament_invitations" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "label" VARCHAR(120),
    "max_uses" SMALLINT,
    "used_count" SMALLINT NOT NULL DEFAULT 0,
    "status" "InvitationStatus" NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_invitations" (
    "id" UUID NOT NULL,
    "tournament_team_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "used_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_photos" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "tournament_team_id" UUID,
    "storage_key" TEXT NOT NULL,
    "thumb_key" TEXT,
    "mime_type" VARCHAR(60) NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_documents" (
    "id" UUID NOT NULL,
    "tournament_team_id" UUID NOT NULL,
    "player_id" UUID,
    "doc_type" VARCHAR(60) NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" VARCHAR(60) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" UUID NOT NULL,
    "tournament_team_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "scope" VARCHAR(40) NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT false,
    "guardian_name" VARCHAR(150),
    "granted_by_user_id" UUID,
    "document_key" TEXT,
    "effective_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(60) NOT NULL,
    "entity_id" TEXT,
    "tournament_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournament_invitations_token_hash_key" ON "tournament_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "tournament_invitations_tournament_id_status_idx" ON "tournament_invitations"("tournament_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "player_invitations_token_hash_key" ON "player_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "player_invitations_tournament_team_id_idx" ON "player_invitations"("tournament_team_id");

-- CreateIndex
CREATE INDEX "player_photos_player_id_idx" ON "player_photos"("player_id");

-- CreateIndex
CREATE INDEX "player_documents_tournament_team_id_idx" ON "player_documents"("tournament_team_id");

-- CreateIndex
CREATE UNIQUE INDEX "consent_records_player_id_tournament_team_id_scope_key" ON "consent_records"("player_id", "tournament_team_id", "scope");

-- CreateIndex
CREATE INDEX "audit_logs_tournament_id_created_at_idx" ON "audit_logs"("tournament_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "tournament_teams_invitation_id_idx" ON "tournament_teams"("invitation_id");

-- AddForeignKey
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "tournament_invitations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_invitations" ADD CONSTRAINT "tournament_invitations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_invitations" ADD CONSTRAINT "tournament_invitations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_invitations" ADD CONSTRAINT "player_invitations_tournament_team_id_fkey" FOREIGN KEY ("tournament_team_id") REFERENCES "tournament_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_invitations" ADD CONSTRAINT "player_invitations_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_invitations" ADD CONSTRAINT "player_invitations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_photos" ADD CONSTRAINT "player_photos_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_photos" ADD CONSTRAINT "player_photos_tournament_team_id_fkey" FOREIGN KEY ("tournament_team_id") REFERENCES "tournament_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_photos" ADD CONSTRAINT "player_photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_documents" ADD CONSTRAINT "player_documents_tournament_team_id_fkey" FOREIGN KEY ("tournament_team_id") REFERENCES "tournament_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_documents" ADD CONSTRAINT "player_documents_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_documents" ADD CONSTRAINT "player_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_tournament_team_id_fkey" FOREIGN KEY ("tournament_team_id") REFERENCES "tournament_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
