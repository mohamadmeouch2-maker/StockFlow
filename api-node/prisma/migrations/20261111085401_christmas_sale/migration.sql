-- AlterTable
ALTER TABLE "products" ADD COLUMN     "promotion_id" INTEGER;

-- CreateTable
CREATE TABLE "promotions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A discount is between 1% and 90% (added by hand: Prisma cannot generate CHECK rules).
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_percent_check" CHECK ("percent" BETWEEN 1 AND 90);
