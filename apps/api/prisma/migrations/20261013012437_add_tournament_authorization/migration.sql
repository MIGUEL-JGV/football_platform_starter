-- CreateEnum
CREATE TYPE "AuthorizationStatus" AS ENUM ('active', 'revoked');

-- CreateTable
CREATE TABLE "tournament_authorizations" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "label" VARCHAR(120),
    "status" "AuthorizationStatus" NOT NULL DEFAULT 'active',
    "max_uses" SMALLINT,
    "used_count" SMALLINT NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournament_authorizations_token_hash_key" ON "tournament_authorizations"("token_hash");

-- CreateIndex
CREATE INDEX "tournament_authorizations_tournament_id_status_idx" ON "tournament_authorizations"("tournament_id", "status");

-- AddForeignKey
ALTER TABLE "tournament_authorizations" ADD CONSTRAINT "tournament_authorizations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_authorizations" ADD CONSTRAINT "tournament_authorizations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
