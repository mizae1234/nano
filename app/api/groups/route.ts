// ─── น้องนาโน — Groups API ───────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hasMinRole } from "@/lib/tenant";
import { Role } from "@prisma/client";

// GET /api/groups — ดึงรายการ GroupConfig ของ tenant
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const groups = await prisma.groupConfig.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        groupSystems: {
          include: {
            system: { select: { id: true, name: true, icon: true, code: true, color: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("GET /api/groups error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// POST /api/groups — สร้าง GroupConfig + ผูก Systems
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    if (!hasMinRole(session.user.role as Role, "ADMIN")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const body = await request.json();
    const { lineGroupId, name, systemIds } = body;

    if (!lineGroupId || !name) {
      return NextResponse.json(
        { error: "กรุณาระบุ lineGroupId และ name" },
        { status: 400 }
      );
    }

    const group = await prisma.groupConfig.create({
      data: {
        tenantId: session.user.tenantId,
        lineGroupId,
        name,
        groupSystems: systemIds?.length
          ? {
              create: systemIds.map((sid: string) => ({
                systemId: sid,
              })),
            }
          : undefined,
      },
      include: {
        groupSystems: {
          include: {
            system: { select: { id: true, name: true, icon: true, code: true } },
          },
        },
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("POST /api/groups error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
