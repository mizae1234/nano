// ─── น้องนาโน — Tenant Settings API ─────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getNanoSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { hasMinRole } from "@/lib/tenant";
import { Role } from "@prisma/client";

// GET /api/tenant/settings
export async function GET() {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: {
        id: true, slug: true, name: true, logoUrl: true, themeColor: true,
        plan: true, trialEndsAt: true, isActive: true, dbMode: true,
        lineOaGroupId: true, createdAt: true,
        _count: { select: { users: true, tickets: true, departments: true } },
      },
    });

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("GET tenant settings error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// PATCH /api/tenant/settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    if (!hasMinRole(session.role as Role, "SUPER_ADMIN")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const body = await request.json();

    const tenant = await prisma.tenant.update({
      where: { id: session.tenantId },
      data: {
        name: body.name,
        logoUrl: body.logoUrl,
        themeColor: body.themeColor,
      },
    });

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("PATCH tenant settings error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
