// ─── น้องนาโน — Readonly PrismaClient ────────────────────────
// ใช้ main prisma client (Prisma ORM = parameterized queries = SQL-injection safe)
// DATABASE_READONLY_URL สำหรับ future use เมื่อ set up read replica

export { default as prismaReadonly } from "./prisma";
export { default } from "./prisma";
