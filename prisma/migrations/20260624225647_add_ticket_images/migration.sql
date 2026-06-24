-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
