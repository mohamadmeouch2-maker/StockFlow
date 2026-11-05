-- CHECK constraints from the hand-written schema (guide 1.3).
-- Prisma cannot generate these, so they are added by hand (guide 2.3).
ALTER TABLE "products" ADD CONSTRAINT "products_price_check" CHECK ("price" > 0);
ALTER TABLE "products" ADD CONSTRAINT "products_stock_check" CHECK ("stock" >= 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_check" CHECK ("quantity" > 0);
