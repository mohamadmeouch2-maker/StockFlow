-- Customers get a bell too: notifications about their orders and customer service answers.
-- (On their own: PostgreSQL can use new enum values only after the step that adds them is finished.)
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_SHIPPED';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_DELIVERED';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'SUPPORT_ANSWER';
