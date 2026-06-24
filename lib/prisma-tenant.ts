// ─── น้องนาโน — Tenant-aware PrismaClient Resolution ─────────

import { PrismaClient } from "@prisma/client";
import { decrypt } from "./encrypt";
import prisma from "./prisma";

// Cache สำหรับ Dedicated DB clients — ป้องกันการสร้าง connection ใหม่ทุก request
const dedicatedClients = new Map<string, PrismaClient>();

interface TenantDbInfo {
  id: string;
  dbMode: "SHARED" | "DEDICATED";
  dedicatedDbUrl: string | null;
}

/**
 * คืน PrismaClient ที่ถูกต้องตาม tenant:
 * - SHARED → ใช้ global prisma singleton
 * - DEDICATED → ใช้ cached PrismaClient ที่ต่อ dedicated DB
 */
export function getPrismaForTenant(tenant: TenantDbInfo): PrismaClient {
  if (tenant.dbMode === "SHARED") {
    return prisma;
  }

  // DEDICATED mode
  if (!tenant.dedicatedDbUrl) {
    throw new Error(
      `Tenant ${tenant.id} อยู่ในโหมด DEDICATED แต่ไม่มี dedicatedDbUrl`
    );
  }

  // ดึงจาก cache ถ้ามี
  const cached = dedicatedClients.get(tenant.id);
  if (cached) {
    return cached;
  }

  // สร้าง client ใหม่พร้อม decrypt URL
  const dbUrl = decrypt(tenant.dedicatedDbUrl);
  const client = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: ["error"],
  } as any);

  // เก็บไว้ใน cache
  dedicatedClients.set(tenant.id, client);

  return client;
}

/**
 * ลบ PrismaClient ออกจาก cache (ใช้หลัง migration สำเร็จ)
 * เพื่อให้ request ถัดไปสร้าง client ใหม่ที่ชี้ไปยัง dedicated DB
 */
export async function invalidateTenantClient(
  tenantId: string
): Promise<void> {
  const client = dedicatedClients.get(tenantId);
  if (client) {
    await client.$disconnect();
    dedicatedClients.delete(tenantId);
  }
}

/**
 * Disconnect ทุก dedicated client (ใช้ตอน graceful shutdown)
 */
export async function disconnectAllDedicatedClients(): Promise<void> {
  const promises = Array.from(dedicatedClients.values()).map((client) =>
    client.$disconnect()
  );
  await Promise.all(promises);
  dedicatedClients.clear();
}
