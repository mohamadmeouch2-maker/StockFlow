-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LOW_STOCK', 'OUT_OF_STOCK');

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "product_id" INTEGER NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_read_at_idx" ON "notifications"("read_at");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
