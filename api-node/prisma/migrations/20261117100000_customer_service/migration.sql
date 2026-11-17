-- Customer service: conversations (support_tickets) and their messages (support_messages)
-- replace the old one-message problem reports (order_issues).

-- CreateEnum
CREATE TYPE "SupportTopic" AS ENUM ('SIGN_IN', 'ORDER', 'DELIVERY', 'RETURN', 'PAYMENT', 'CHANGE', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('OPEN', 'ANSWERED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "SupportAuthor" AS ENUM ('CUSTOMER', 'STAFF');

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "topic" "SupportTopic" NOT NULL,
    "order_id" INTEGER,
    "status" "SupportStatus" NOT NULL DEFAULT 'OPEN',
    "customer_unread" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "author" "SupportAuthor" NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_tickets_user_id_idx" ON "support_tickets"("user_id");

-- CreateIndex
CREATE INDEX "support_messages_ticket_id_idx" ON "support_messages"("ticket_id");

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written: a message can't be empty, and answers need an email address.
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_body_check" CHECK (length(btrim("body")) > 0);
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_email_check" CHECK ("email" LIKE '%_@_%');

-- Hand-written: move the old problem reports into conversations, so nothing is lost.
-- The kind of problem becomes the topic (and the start of the message); the admin's reply becomes a second message.
INSERT INTO "support_tickets" ("id", "user_id", "name", "email", "topic", "order_id", "status", "customer_unread", "created_at", "updated_at")
SELECT i."id", i."user_id", u."name", u."email",
       (CASE i."type"::text WHEN 'LATE_DELIVERY' THEN 'DELIVERY' WHEN 'OTHER' THEN 'OTHER' ELSE 'ORDER' END)::"SupportTopic",
       i."order_id",
       (CASE WHEN i."status"::text = 'RESOLVED' THEN 'RESOLVED' WHEN i."admin_reply" IS NOT NULL THEN 'ANSWERED' ELSE 'OPEN' END)::"SupportStatus",
       false, i."created_at", i."updated_at"
FROM "order_issues" i JOIN "users" u ON u."id" = i."user_id";

INSERT INTO "support_messages" ("ticket_id", "author", "body", "created_at")
SELECT i."id", 'CUSTOMER',
       (CASE i."type"::text WHEN 'WRONG_ITEM' THEN 'Wrong item: ' WHEN 'DAMAGED' THEN 'Damaged item: ' WHEN 'MISSING_ITEM' THEN 'Missing item: ' ELSE '' END) || i."message",
       i."created_at"
FROM "order_issues" i ORDER BY i."id";

INSERT INTO "support_messages" ("ticket_id", "author", "body", "created_at")
SELECT i."id", 'STAFF', i."admin_reply", i."updated_at" FROM "order_issues" i WHERE i."admin_reply" IS NOT NULL ORDER BY i."id";

-- New conversations continue after the moved ones
SELECT setval(pg_get_serial_sequence('"support_tickets"', 'id'), COALESCE((SELECT MAX("id") FROM "support_tickets"), 0) + 1, false);

-- The old table and its types are no longer used
DROP TABLE "order_issues";
DROP TYPE "IssueStatus";
DROP TYPE "IssueType";
