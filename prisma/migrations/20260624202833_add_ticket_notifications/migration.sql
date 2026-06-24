-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "notifyChannel" TEXT NOT NULL DEFAULT 'DIRECT',
ADD COLUMN     "notifyGroupId" TEXT,
ADD COLUMN     "notifyOnResolve" BOOLEAN NOT NULL DEFAULT true;
