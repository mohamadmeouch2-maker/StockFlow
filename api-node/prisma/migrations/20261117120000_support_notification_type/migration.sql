-- The bell also shows customer service messages. (On its own: PostgreSQL can use a new enum value
-- only after the step that adds it is finished, and the next migration uses it.)
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'SUPPORT_MESSAGE';
