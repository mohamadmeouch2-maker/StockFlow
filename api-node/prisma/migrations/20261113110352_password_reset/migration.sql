-- CreateEnum
CREATE TYPE "CodePurpose" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');

-- AlterTable
ALTER TABLE "email_codes" ADD COLUMN     "purpose" "CodePurpose" NOT NULL DEFAULT 'VERIFY_EMAIL';
