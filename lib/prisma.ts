// ─── น้องนาโน — Shared DB PrismaClient (Prisma 7) ────────────

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  let pool: Pool;

  if (connectionString && connectionString.startsWith("postgresql://")) {
    const matches = connectionString.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
    if (matches) {
      const [, user, encodedPassword, host, portStr, database] = matches;
      const password = decodeURIComponent(encodedPassword);
      const port = parseInt(portStr, 10);

      pool = new Pool({
        host,
        port,
        user,
        password,
        database,
        ssl: false,
      });
    } else {
      pool = new Pool({
        connectionString,
      });
    }
  } else {
    pool = new Pool({
      connectionString,
    });
  }

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
