-- AlterTable
ALTER TABLE "users" ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 0;

-- Hand-written: the number can't go below zero.
ALTER TABLE "users" ADD CONSTRAINT "users_token_version_check" CHECK ("token_version" >= 0);
