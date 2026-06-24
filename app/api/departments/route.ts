// ─── น้องนาโน — Departments API ──────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hasMinRole } from "@/lib/tenant";
import { checkLimit } from "@/lib/plan-limits";
import { Role } from "@prisma/client";

// GET /api/departments
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const departments = await prisma.department.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        _count: {
          select: {
            users: true,
            tickets: { where: { status: { not: "CLOSED" } } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error("GET departments error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// POST /api/departments
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    if (!hasMinRole(session.user.role as Role, "ADMIN")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const { tenantId, tenantPlan } = session.user;

    // ตรวจสอบ limit
    const deptCount = await prisma.department.count({ where: { tenantId } });
    const limitCheck = checkLimit(tenantPlan, "departments", deptCount);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.message }, { status: 403 });
    }

    const body = await request.json();

    const department = await prisma.department.create({
      data: {
        tenantId,
        name: body.name,
        description: body.description || null,
      },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error("POST department error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
