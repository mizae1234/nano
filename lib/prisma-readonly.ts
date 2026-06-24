// ─── น้องนาโน — Shared DB PrismaClient (readonly สำหรับ Gemini) ──

import { PrismaClient } from "@prisma/client";

const globalForPrismaReadonly = globalThis as unknown as {
  prismaReadonly: PrismaClient | undefined;
};

const readonlyUrl = process.env.DATABASE_READONLY_URL || process.env.DATABASE_URL;

export const prismaReadonly =
  globalForPrismaReadonly.prismaReadonly ??
  new PrismaClient({
    datasources: {
      db: {
        url: readonlyUrl!,
      },
    },
    log: ["error"],
  } as any);

if (process.env.NODE_ENV !== "production")
  globalForPrismaReadonly.prismaReadonly = prismaReadonly;

export default prismaReadonly;
