-- AlterTable
ALTER TABLE "match_events" ADD COLUMN     "secondary_team_roster_id" UUID;

-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN     "max_teams" SMALLINT;
