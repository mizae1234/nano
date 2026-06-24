-- AlterTable
ALTER TABLE "GroupConfig" ADD COLUMN     "autoJoined" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "memberCount" INTEGER,
ADD COLUMN     "pushOnAssigned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pushOnNewTicket" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pushOnResolved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pushOnUrgent" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushTemplate" TEXT;
