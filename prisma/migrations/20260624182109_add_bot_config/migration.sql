-- CreateTable
CREATE TABLE "BotConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "botName" TEXT NOT NULL DEFAULT 'น้องนาโน',
    "botPersona" TEXT NOT NULL DEFAULT 'ค่ะ',
    "themeColor" TEXT NOT NULL DEFAULT '#0066FF',
    "welcomeMessage" TEXT NOT NULL DEFAULT 'สวัสดีค่ะ ยินดีต้อนรับสู่ระบบ Service Ticket 🎉
พิมพ์ "ช่วย" เพื่อดูเมนูการใช้งานค่ะ',
    "menuMessage" TEXT NOT NULL DEFAULT 'เลือกสิ่งที่ต้องการค่ะ 😊',
    "triggerWords" TEXT NOT NULL DEFAULT 'นาโน,@นาโน,nano,@nano',
    "systemPrompt" TEXT,
    "aiModel" TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotConfig_tenantId_key" ON "BotConfig"("tenantId");

-- AddForeignKey
ALTER TABLE "BotConfig" ADD CONSTRAINT "BotConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
