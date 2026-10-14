/*
  Warnings:

  - Added the required column `created_by` to the `players` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "players" ADD COLUMN     "created_by" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
