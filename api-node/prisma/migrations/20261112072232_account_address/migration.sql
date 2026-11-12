-- The delivery address a customer saves in My account; the cart fills it in. NULL = none saved.
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "phone" TEXT;

-- All three or none, like on orders
ALTER TABLE "users" ADD CONSTRAINT "users_address_complete" CHECK (
  (phone IS NULL AND city IS NULL AND address IS NULL)
  OR (phone IS NOT NULL AND city IS NOT NULL AND address IS NOT NULL)
);
