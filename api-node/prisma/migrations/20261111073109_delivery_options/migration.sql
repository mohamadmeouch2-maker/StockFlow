-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('STANDARD', 'EXPRESS');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deliver_by" TIMESTAMP(3),
ADD COLUMN     "delivery" "DeliveryMethod" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "delivery_fee" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Orders placed before this change were standard deliveries: at most 5 days.
UPDATE "orders" SET "deliver_by" = "created_at" + INTERVAL '5 days' WHERE "deliver_by" IS NULL;

-- The delivery fee is never negative (Prisma can't generate CHECK rules, so it's added by hand).
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_fee_check" CHECK ("delivery_fee" >= 0);
