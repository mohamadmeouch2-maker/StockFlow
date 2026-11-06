-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('WRONG_ITEM', 'DAMAGED', 'MISSING_ITEM', 'LATE_DELIVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "order_issues" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" "IssueType" NOT NULL,
    "message" TEXT NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "admin_reply" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_issues_order_id_idx" ON "order_issues"("order_id");

-- CreateIndex
CREATE INDEX "order_issues_status_idx" ON "order_issues"("status");

-- AddForeignKey
ALTER TABLE "order_issues" ADD CONSTRAINT "order_issues_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_issues" ADD CONSTRAINT "order_issues_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
