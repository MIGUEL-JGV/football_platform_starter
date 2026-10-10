-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'suspended', 'deleted');

-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('owner', 'admin', 'editor');

-- CreateEnum
CREATE TYPE "TournamentRole" AS ENUM ('manager', 'scorekeeper', 'viewer');

-- CreateEnum
CREATE TYPE "TournamentVisibility" AS ENUM ('public', 'private', 'unlisted');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('draft', 'registration', 'upcoming', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "FootballFormat" AS ENUM ('football_11', 'football_7', 'football_5');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('pending', 'active', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "PhaseType" AS ENUM ('league', 'group_stage', 'knockout');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('scheduled', 'postponed', 'in_progress', 'pending_validation', 'finished', 'cancelled', 'abandoned');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "password_hash" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'active',
    "email_verified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "provider_subject" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "description" TEXT,
    "logo_url" TEXT,
    "contact_email" VARCHAR(320),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "OrganizationRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("organization_id","user_id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "format" "FootballFormat" NOT NULL,
    "visibility" "TournamentVisibility" NOT NULL DEFAULT 'public',
    "status" "TournamentStatus" NOT NULL DEFAULT 'draft',
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "registration_open_at" TIMESTAMPTZ,
    "registration_close_at" TIMESTAMPTZ,
    "start_date" DATE,
    "end_date" DATE,
    "points_win" INTEGER NOT NULL DEFAULT 3,
    "points_draw" INTEGER NOT NULL DEFAULT 1,
    "points_loss" INTEGER NOT NULL DEFAULT 0,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "logo_url" TEXT,
    "cover_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_members" (
    "tournament_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "TournamentRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_members_pkey" PRIMARY KEY ("tournament_id","user_id")
);

-- CreateTable
CREATE TABLE "tournament_follows" (
    "tournament_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_follows_pkey" PRIMARY KEY ("tournament_id","user_id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "description" TEXT,
    "logo_url" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" UUID NOT NULL,
    "display_name" VARCHAR(150) NOT NULL,
    "date_of_birth" DATE,
    "photo_url" TEXT,
    "preferred_position" VARCHAR(40),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_teams" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "registration_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "requested_by" UUID NOT NULL,
    "registered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMPTZ,
    "approved_by" UUID,

    CONSTRAINT "tournament_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_rosters" (
    "id" UUID NOT NULL,
    "tournament_team_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "jersey_number" SMALLINT,
    "position" VARCHAR(40),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "valid_from" DATE,
    "valid_until" DATE,

    CONSTRAINT "team_rosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phases" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "phase_type" "PhaseType" NOT NULL,
    "sequence" SMALLINT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "start_date" DATE,
    "end_date" DATE,
    "rules_override" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_groups" (
    "id" UUID NOT NULL,
    "phase_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sequence" SMALLINT NOT NULL,

    CONSTRAINT "competition_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matchdays" (
    "id" UUID NOT NULL,
    "phase_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sequence" SMALLINT NOT NULL,
    "scheduled_date" DATE,

    CONSTRAINT "matchdays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "timezone" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "phase_id" UUID NOT NULL,
    "group_id" UUID,
    "matchday_id" UUID,
    "home_tournament_team_id" UUID NOT NULL,
    "away_tournament_team_id" UUID NOT NULL,
    "venue_id" UUID,
    "scheduled_at" TIMESTAMPTZ,
    "status" "MatchStatus" NOT NULL DEFAULT 'scheduled',
    "home_score" SMALLINT,
    "away_score" SMALLINT,
    "home_penalty_score" SMALLINT,
    "away_penalty_score" SMALLINT,
    "result_version" INTEGER NOT NULL DEFAULT 0,
    "recorded_by" UUID,
    "validated_by" UUID,
    "validated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_events" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "team_roster_id" UUID,
    "event_type" VARCHAR(30) NOT NULL,
    "minute" SMALLINT,
    "period" VARCHAR(20) NOT NULL DEFAULT 'regular',
    "status" VARCHAR(20) NOT NULL DEFAULT 'valid',
    "recorded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_posts" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "body" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "news_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(80) NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_provider_subject_key" ON "auth_identities"("provider", "provider_subject");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_user_id_provider_key" ON "auth_identities"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "tournaments_status_visibility_start_date_idx" ON "tournaments"("status", "visibility", "start_date");

-- CreateIndex
CREATE INDEX "tournaments_organization_id_status_idx" ON "tournaments"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_organization_id_slug_key" ON "tournaments"("organization_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "teams_slug_key" ON "teams"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_teams_tournament_id_team_id_key" ON "tournament_teams"("tournament_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_teams_id_tournament_id_key" ON "tournament_teams"("id", "tournament_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_rosters_tournament_team_id_player_id_key" ON "team_rosters"("tournament_team_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "phases_tournament_id_sequence_key" ON "phases"("tournament_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "phases_id_tournament_id_key" ON "phases"("id", "tournament_id");

-- CreateIndex
CREATE UNIQUE INDEX "competition_groups_phase_id_name_key" ON "competition_groups"("phase_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "competition_groups_id_phase_id_key" ON "competition_groups"("id", "phase_id");

-- CreateIndex
CREATE UNIQUE INDEX "matchdays_phase_id_sequence_key" ON "matchdays"("phase_id", "sequence");

-- CreateIndex
CREATE INDEX "matches_tournament_id_scheduled_at_idx" ON "matches"("tournament_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "matches_phase_id_matchday_id_idx" ON "matches"("phase_id", "matchday_id");

-- CreateIndex
CREATE INDEX "matches_status_scheduled_at_idx" ON "matches"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "match_events_match_id_status_idx" ON "match_events"("match_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "news_posts_tournament_id_slug_key" ON "news_posts"("tournament_id", "slug");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_members" ADD CONSTRAINT "tournament_members_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_members" ADD CONSTRAINT "tournament_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_follows" ADD CONSTRAINT "tournament_follows_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_follows" ADD CONSTRAINT "tournament_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_rosters" ADD CONSTRAINT "team_rosters_tournament_team_id_fkey" FOREIGN KEY ("tournament_team_id") REFERENCES "tournament_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_rosters" ADD CONSTRAINT "team_rosters_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phases" ADD CONSTRAINT "phases_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_groups" ADD CONSTRAINT "competition_groups_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchdays" ADD CONSTRAINT "matchdays_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_phase_id_tournament_id_fkey" FOREIGN KEY ("phase_id", "tournament_id") REFERENCES "phases"("id", "tournament_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_tournament_team_id_tournament_id_fkey" FOREIGN KEY ("home_tournament_team_id", "tournament_id") REFERENCES "tournament_teams"("id", "tournament_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_tournament_team_id_tournament_id_fkey" FOREIGN KEY ("away_tournament_team_id", "tournament_id") REFERENCES "tournament_teams"("id", "tournament_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "competition_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_matchday_id_fkey" FOREIGN KEY ("matchday_id") REFERENCES "matchdays"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
