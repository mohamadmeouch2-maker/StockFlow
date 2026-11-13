-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "email_codes" (
    "user_id" INTEGER NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_codes_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "email_codes" ADD CONSTRAINT "email_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written: a wrong-tries count can't go below zero.
ALTER TABLE "email_codes" ADD CONSTRAINT "email_codes_attempts_check" CHECK ("attempts" >= 0);

-- Hand-written: everyone who already has an account counts as verified,
-- so the demo accounts (admin, customer, Sara...) can still log in.
UPDATE "users" SET "email_verified_at" = "created_at";
