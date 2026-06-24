// ─── น้องนาโน — Systems API ──────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getNanoSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { hasMinRole } from "@/lib/tenant";
import { Role } from "@prisma/client";

// GET /api/systems — ดึงรายการ system ของ tenant
export async function GET() {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const systems = await prisma.system.findMany({
      where: { tenantId: session.tenantId },
      include: {
        defaultAssignee: { select: { id: true, displayName: true, pictureUrl: true } },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // เพิ่ม ticket stats ต่อ system
    const systemsWithStats = await Promise.all(
      systems.map(async (system) => {
        const [openCount, inProgressCount] = await Promise.all([
          prisma.ticket.count({
            where: { systemId: system.id, status: "OPEN" },
          }),
          prisma.ticket.count({
            where: { systemId: system.id, status: "IN_PROGRESS" },
          }),
        ]);

        return {
          ...system,
          stats: {
            total: system._count.tickets,
            open: openCount,
            inProgress: inProgressCount,
          },
        };
      })
    );

    return NextResponse.json({ systems: systemsWithStats });
  } catch (error) {
    console.error("GET /api/systems error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูล" },
      { status: 500 }
    );
  }
}

// POST /api/systems — สร้าง system ใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    if (!hasMinRole(session.role as Role, "ADMIN")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const body = await request.json();
    const { code, name, description, color, icon, ticketPrefix, defaultAssigneeId } = body;

    if (!code || !name || !ticketPrefix) {
      return NextResponse.json(
        { error: "กรุณาระบุ code, name และ ticketPrefix" },
        { status: 400 }
      );
    }

    // ตรวจสอบ code ซ้ำ
    const existing = await prisma.system.findFirst({
      where: { tenantId: session.tenantId, code: code.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: `code "${code}" ถูกใช้แล้ว` },
        { status: 400 }
      );
    }

    // ตรวจสอบ ticketPrefix ซ้ำ
    const existingPrefix = await prisma.system.findFirst({
      where: { tenantId: session.tenantId, ticketPrefix: ticketPrefix.toUpperCase() },
    });
    if (existingPrefix) {
      return NextResponse.json(
        { error: `ticketPrefix "${ticketPrefix}" ถูกใช้แล้ว` },
        { status: 400 }
      );
    }

    const system = await prisma.system.create({
      data: {
        tenantId: session.tenantId,
        code: code.toLowerCase(),
        name,
        description: description || null,
        color: color || "#0066FF",
        icon: icon || null,
        ticketPrefix: ticketPrefix.toUpperCase(),
        defaultAssigneeId: defaultAssigneeId || null,
      },
    });

    return NextResponse.json(system, { status: 201 });
  } catch (error) {
    console.error("POST /api/systems error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการสร้างระบบ" },
      { status: 500 }
    );
  }
}
