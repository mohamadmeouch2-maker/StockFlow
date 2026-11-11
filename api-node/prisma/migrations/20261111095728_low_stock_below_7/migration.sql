-- AlterTable
ALTER TABLE "products" ALTER COLUMN "reorder_level" SET DEFAULT 6;

-- Every product shows "Low stock" when fewer than 7 are left (the admin can still change one product later).
UPDATE "products" SET "reorder_level" = 6;
