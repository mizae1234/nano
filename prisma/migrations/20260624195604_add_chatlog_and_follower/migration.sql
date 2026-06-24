-- CreateTable
CREATE TABLE "ChatLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "lineUid" TEXT NOT NULL,
    "displayName" TEXT,
    "lineGroupId" TEXT,
    "messageText" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'INCOMING',
    "replyAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketFollower" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketFollower_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatLog_tenantId_createdAt_idx" ON "ChatLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatLog_tenantId_lineUid_idx" ON "ChatLog"("tenantId", "lineUid");

-- CreateIndex
CREATE UNIQUE INDEX "TicketFollower_ticketId_userId_key" ON "TicketFollower"("ticketId", "userId");

-- AddForeignKey
ALTER TABLE "ChatLog" ADD CONSTRAINT "ChatLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketFollower" ADD CONSTRAINT "TicketFollower_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketFollower" ADD CONSTRAINT "TicketFollower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
