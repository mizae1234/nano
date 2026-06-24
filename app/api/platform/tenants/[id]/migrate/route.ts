// ─── น้องนาโน — Platform Migration Trigger API ──────────────

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { migrateTenantToDedicatedDb, testDedicatedDbConnection } from "@/lib/migrate";

// POST /api/platform/tenants/[id]/migrate
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { dedicatedDbUrl, testOnly } = body;

    if (!dedicatedDbUrl) {
      return NextResponse.json({ error: "กรุณากรอก Database URL" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: params.id } });
    if (!tenant) {
      return NextResponse.json({ error: "ไม่พบ Tenant" }, { status: 404 });
    }

    if (tenant.plan !== "ENTERPRISE") {
      return NextResponse.json(
        { error: "ต้องเป็นแผน Enterprise เท่านั้น" },
        { status: 403 }
      );
    }

    // ทดสอบ connection
    const testResult = await testDedicatedDbConnection(dedicatedDbUrl);
    if (!testResult.success) {
      return NextResponse.json({ error: testResult.error }, { status: 400 });
    }

    if (testOnly) {
      return NextResponse.json({ success: true, message: "เชื่อมต่อสำเร็จ" });
    }

    // เริ่ม migration แบบ background
    migrateTenantToDedicatedDb(params.id, dedicatedDbUrl).catch(console.error);

    return NextResponse.json(
      { message: "เริ่มย้ายข้อมูลแล้ว" },
      { status: 202 }
    );
  } catch (error) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
