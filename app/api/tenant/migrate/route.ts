// ─── น้องนาโน — Migration API ────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getNanoSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { hasMinRole } from "@/lib/tenant";
import { migrateTenantToDedicatedDb, testDedicatedDbConnection } from "@/lib/migrate";
import { Role } from "@prisma/client";

// GET /api/tenant/migrate — ดูสถานะ migration
export async function GET() {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const log = await prisma.migrationLog.findUnique({
      where: { tenantId: session.tenantId },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { dbMode: true, plan: true },
    });

    return NextResponse.json({ migrationLog: log, dbMode: tenant?.dbMode, plan: tenant?.plan });
  } catch (error) {
    console.error("GET migrate error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// POST /api/tenant/migrate — เริ่ม migration หรือทดสอบ
export async function POST(request: NextRequest) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    if (!hasMinRole(session.role as Role, "SUPER_ADMIN")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    if (session.tenantPlan !== "ENTERPRISE") {
      return NextResponse.json(
        { error: "ฟีเจอร์ Dedicated Database ใช้งานได้เฉพาะแผน Enterprise" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { dedicatedDbUrl, testOnly } = body;

    if (!dedicatedDbUrl) {
      return NextResponse.json(
        { error: "กรุณากรอก Database URL" },
        { status: 400 }
      );
    }

    // ทดสอบการเชื่อมต่อ
    const testResult = await testDedicatedDbConnection(dedicatedDbUrl);
    if (!testResult.success) {
      return NextResponse.json({ error: testResult.error }, { status: 400 });
    }

    if (testOnly) {
      return NextResponse.json({
        success: true,
        message: "เชื่อมต่อฐานข้อมูลสำเร็จ",
      });
    }

    // เริ่ม migration แบบ background (return 202 ทันที)
    migrateTenantToDedicatedDb(session.tenantId, dedicatedDbUrl).catch(
      (error) => {
        console.error("Background migration error:", error);
      }
    );

    return NextResponse.json(
      { message: "เริ่มกระบวนการย้ายข้อมูลแล้ว กรุณาตรวจสอบสถานะเป็นระยะ" },
      { status: 202 }
    );
  } catch (error) {
    console.error("POST migrate error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
