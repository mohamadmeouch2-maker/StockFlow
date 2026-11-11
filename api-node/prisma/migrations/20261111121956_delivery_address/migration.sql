-- Where to bring the order, typed in the cart. Orders from before Nov 11 have none (NULL).
-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "phone" TEXT;

-- All three or none: an order never has a phone number without an address, or the other way round
ALTER TABLE "orders" ADD CONSTRAINT "orders_ship_to_complete" CHECK (
  (phone IS NULL AND city IS NULL AND address IS NULL)
  OR (phone IS NOT NULL AND city IS NOT NULL AND address IS NOT NULL)
);
