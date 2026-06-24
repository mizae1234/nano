// ─── น้องนาโน — Shared → Dedicated DB Migration ─────────────

import { PrismaClient } from "@prisma/client";
import prisma from "./prisma";
import { encrypt } from "./encrypt";
import { invalidateTenantClient } from "./prisma-tenant";

/**
 * ย้ายข้อมูล Tenant จาก Shared DB ไป Dedicated DB
 *
 * ขั้นตอน:
 * 1. สร้าง MigrationLog (status: "in_progress")
 * 2. Dump records ทั้งหมดของ tenant จาก Shared DB
 * 3. เชื่อมต่อ Dedicated DB
 * 4. Insert records ลง Dedicated DB (ตามลำดับ: dept → users → categories → tickets → comments → audit_logs)
 * 5. อัปเดต tenant: dbMode = DEDICATED, dedicatedDbUrl = encrypted
 * 6. อัปเดต MigrationLog: status = "completed"
 * 7. ลบ records จาก Shared DB (ลำดับกลับกัน)
 * 8. Invalidate Prisma client cache
 *
 * ถ้าล้มเหลว: เก็บข้อมูลไว้ใน Shared DB, บันทึก error
 */
export async function migrateTenantToDedicatedDb(
  tenantId: string,
  dedicatedDbUrl: string
): Promise<void> {
  // 1. สร้าง/อัปเดต MigrationLog
  await prisma.migrationLog.upsert({
    where: { tenantId },
    create: {
      tenantId,
      status: "in_progress",
      startedAt: new Date(),
    },
    update: {
      status: "in_progress",
      startedAt: new Date(),
      error: null,
      completedAt: null,
    },
  });

  let dedicatedPrisma: PrismaClient | null = null;

  try {
    // 2. Dump ข้อมูลจาก Shared DB
    const departments = await prisma.department.findMany({
      where: { tenantId },
    });
    const users = await prisma.user.findMany({ where: { tenantId } });
    const categories = await prisma.category.findMany({
      where: { tenantId },
    });
    const tickets = await prisma.ticket.findMany({ where: { tenantId } });
    const comments = await prisma.ticketComment.findMany({
      where: { ticket: { tenantId } },
    });
    const auditLogs = await prisma.auditLog.findMany({
      where: { tenantId },
    });

    // 3. เชื่อมต่อ Dedicated DB
    dedicatedPrisma = new PrismaClient({
      datasources: {
        db: {
          url: dedicatedDbUrl,
        },
      },
    } as any);

    // 4. Insert ข้อมูลลง Dedicated DB (ตามลำดับ dependency)
    // ต้องสร้าง tenant record ก่อน
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error(`ไม่พบ Tenant: ${tenantId}`);
    }

    await dedicatedPrisma.tenant.create({
      data: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        logoUrl: tenant.logoUrl,
        themeColor: tenant.themeColor,
        plan: tenant.plan,
        trialEndsAt: tenant.trialEndsAt,
        isActive: tenant.isActive,
        dbMode: "DEDICATED",
        lineOaToken: tenant.lineOaToken,
        lineOaSecret: tenant.lineOaSecret,
        lineOaGroupId: tenant.lineOaGroupId,
        createdAt: tenant.createdAt,
      },
    });

    // Departments
    for (const dept of departments) {
      await dedicatedPrisma.department.create({ data: { ...dept } });
    }

    // Users
    for (const user of users) {
      await dedicatedPrisma.user.create({ data: { ...user } });
    }

    // Categories
    for (const cat of categories) {
      await dedicatedPrisma.category.create({ data: { ...cat } });
    }

    // Tickets
    for (const ticket of tickets) {
      await dedicatedPrisma.ticket.create({ data: { ...ticket } });
    }

    // Comments
    for (const comment of comments) {
      await dedicatedPrisma.ticketComment.create({ data: { ...comment } });
    }

    // Audit Logs
    for (const log of auditLogs) {
      await dedicatedPrisma.auditLog.create({ data: { ...log } });
    }

    // 5. อัปเดต tenant ใน Shared DB
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        dbMode: "DEDICATED",
        dedicatedDbUrl: encrypt(dedicatedDbUrl),
      },
    });

    // 6. อัปเดต MigrationLog
    await prisma.migrationLog.update({
      where: { tenantId },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    // 7. ลบข้อมูลจาก Shared DB (ลำดับกลับกัน — ห้ามลบ tenant record)
    await prisma.auditLog.deleteMany({ where: { tenantId } });
    await prisma.ticketComment.deleteMany({
      where: { ticket: { tenantId } },
    });
    await prisma.ticket.deleteMany({ where: { tenantId } });
    await prisma.category.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.department.deleteMany({ where: { tenantId } });

    // 8. Invalidate cache
    await invalidateTenantClient(tenantId);

    console.log(
      `✅ Migration สำเร็จสำหรับ tenant ${tenantId}`
    );
  } catch (error) {
    // บันทึก error
    await prisma.migrationLog.update({
      where: { tenantId },
      data: {
        status: "failed",
        error: (error as Error).message,
      },
    });

    console.error(
      `❌ Migration ล้มเหลวสำหรับ tenant ${tenantId}:`,
      error
    );
    throw error;
  } finally {
    if (dedicatedPrisma) {
      await dedicatedPrisma.$disconnect();
    }
  }
}

/**
 * ทดสอบการเชื่อมต่อ Dedicated DB
 */
export async function testDedicatedDbConnection(
  dbUrl: string
): Promise<{ success: boolean; error?: string }> {
  let client: PrismaClient | null = null;
  try {
    client = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    } as any);
    await client.$connect();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `ไม่สามารถเชื่อมต่อฐานข้อมูลได้: ${(error as Error).message}`,
    };
  } finally {
    if (client) {
      await client.$disconnect();
    }
  }
}
