-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('BUG', 'FEATURE', 'TASK', 'QUESTION');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "systemId" TEXT,
ADD COLUMN     "ticketType" "TicketType" NOT NULL DEFAULT 'BUG';

-- CreateTable
CREATE TABLE "System" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#0066FF',
    "icon" TEXT,
    "ticketPrefix" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultAssigneeId" TEXT,
    "lineOaToken" TEXT,
    "lineOaSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "System_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "lineGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupSystem" (
    "id" TEXT NOT NULL,
    "groupConfigId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "GroupSystem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "System_tenantId_code_key" ON "System"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "System_tenantId_ticketPrefix_key" ON "System"("tenantId", "ticketPrefix");

-- CreateIndex
CREATE UNIQUE INDEX "GroupConfig_tenantId_lineGroupId_key" ON "GroupConfig"("tenantId", "lineGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupSystem_groupConfigId_systemId_key" ON "GroupSystem"("groupConfigId", "systemId");

-- CreateIndex
CREATE INDEX "Ticket_tenantId_systemId_idx" ON "Ticket"("tenantId", "systemId");

-- AddForeignKey
ALTER TABLE "System" ADD CONSTRAINT "System_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "System" ADD CONSTRAINT "System_defaultAssigneeId_fkey" FOREIGN KEY ("defaultAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupConfig" ADD CONSTRAINT "GroupConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupSystem" ADD CONSTRAINT "GroupSystem_groupConfigId_fkey" FOREIGN KEY ("groupConfigId") REFERENCES "GroupConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupSystem" ADD CONSTRAINT "GroupSystem_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE SET NULL ON UPDATE CASCADE;
