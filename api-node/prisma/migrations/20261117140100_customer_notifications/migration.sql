-- A notification can belong to one customer (user_id) and be about their order (order_id).
-- user_id null = for the admins, as before.
-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "order_id" INTEGER,
ADD COLUMN     "user_id" INTEGER;

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written: a notification is about exactly one thing: a product, a conversation or an order.
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_about_check";
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_about_check" CHECK (num_nonnulls("product_id", "ticket_id", "order_id") = 1);
-- Hand-written: who it is for. Stock alerts and new customer messages are for the admins;
-- order news and customer service answers are for one customer.
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_audience_check" CHECK (
  ("user_id" IS NULL) = ("type" IN ('LOW_STOCK', 'OUT_OF_STOCK', 'SUPPORT_MESSAGE'))
);

-- Hand-written: customers who already have an answer they haven't seen get it in their bell.
INSERT INTO "notifications" ("type", "message", "user_id", "ticket_id", "created_at")
SELECT 'SUPPORT_ANSWER', 'Customer service answered your message about ' ||
       CASE t."topic"::text
         WHEN 'SIGN_IN' THEN 'Signing in and my account' WHEN 'ORDER' THEN 'An order' WHEN 'DELIVERY' THEN 'Delivery'
         WHEN 'RETURN' THEN 'Returns' WHEN 'PAYMENT' THEN 'Payments and cards' WHEN 'CHANGE' THEN 'Change or cancel an order'
         ELSE 'Something else' END,
       t."user_id", t."id", t."updated_at"
FROM "support_tickets" t WHERE t."customer_unread" AND t."user_id" IS NOT NULL ORDER BY t."updated_at";
