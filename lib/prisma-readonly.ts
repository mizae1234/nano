// ─── น้องนาโน — Readonly PrismaClient (สำหรับ Gemini AI query) ──
// ใช้ DATABASE_READONLY_URL — SELECT เท่านั้น ป้องกันการแก้ข้อมูล
// Prisma v7: ต้องเซ็ต env ก่อน instantiate

import { PrismaClient } from "@prisma/client";

const globalForPrismaReadonly = globalThis as unknown as {
  prismaReadonly: PrismaClient | undefined;
};

function createReadonlyClient(): PrismaClient {
  const readonlyUrl = process.env.DATABASE_READONLY_URL || process.env.DATABASE_URL;
  if (!readonlyUrl) throw new Error("DATABASE_URL is not set");

  // Prisma v7 อ่าน URL จาก env โดยตรง — set ชั่วคราว แล้ว restore
  const original = process.env.DATABASE_URL;
  process.env.DATABASE_URL = readonlyUrl;
  const client = new PrismaClient({ log: ["error"] });
  process.env.DATABASE_URL = original;
  return client;
}

export const prismaReadonly =
  globalForPrismaReadonly.prismaReadonly ?? createReadonlyClient();

if (process.env.NODE_ENV !== "production")
  globalForPrismaReadonly.prismaReadonly = prismaReadonly;

export default prismaReadonly;
