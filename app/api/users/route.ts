// ─── น้องนาโน — Users API ────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getNanoSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { hasMinRole } from "@/lib/tenant";
import { checkLimit } from "@/lib/plan-limits";
import { Role } from "@prisma/client";

// GET /api/users
export async function GET() {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    if (!hasMinRole(session.role as Role, "DEPT_ADMIN")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const where: Record<string, unknown> = { tenantId: session.tenantId };

    // DEPT_ADMIN เห็นเฉพาะคนในแผนกตัวเอง
    if (session.role === "DEPT_ADMIN" && session.departmentId) {
      where.departmentId = session.departmentId;
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        department: { select: { name: true } },
        _count: { select: { createdTickets: true, assignedTickets: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// POST /api/users — เชิญผู้ใช้ใหม่ (จะถูกสร้างจริงตอน LINE login)
export async function POST(request: NextRequest) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    if (!hasMinRole(session.role as Role, "ADMIN")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const { tenantId, tenantPlan } = session;

    // ตรวจสอบ limit
    const userCount = await prisma.user.count({ where: { tenantId } });
    const limitCheck = checkLimit(tenantPlan, "users", userCount);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.message }, { status: 403 });
    }

    const body = await request.json();

    const user = await prisma.user.create({
      data: {
        tenantId,
        lineUid: body.lineUid,
        displayName: body.displayName,
        role: body.role || "USER",
        departmentId: body.departmentId || null,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
