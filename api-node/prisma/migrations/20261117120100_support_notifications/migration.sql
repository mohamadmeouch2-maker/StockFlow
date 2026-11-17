-- A notification is about a product (stock alerts) or about a customer service conversation.
-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "ticket_id" INTEGER,
ALTER COLUMN "product_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written: exactly one of the two: a product or a conversation.
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_about_check" CHECK (("product_id" IS NULL) <> ("ticket_id" IS NULL));

-- Hand-written: the conversations that already wait for an answer get a notification, so the bell shows them too.
INSERT INTO "notifications" ("type", "message", "ticket_id", "created_at")
SELECT 'SUPPORT_MESSAGE', 'New message from ' || t."name" || ': ' ||
       CASE t."topic"::text
         WHEN 'SIGN_IN' THEN 'Signing in and my account' WHEN 'ORDER' THEN 'An order' WHEN 'DELIVERY' THEN 'Delivery'
         WHEN 'RETURN' THEN 'Returns' WHEN 'PAYMENT' THEN 'Payments and cards' WHEN 'CHANGE' THEN 'Change or cancel an order'
         ELSE 'Something else' END,
       t."id", t."updated_at"
FROM "support_tickets" t WHERE t."status" = 'OPEN' ORDER BY t."updated_at";
