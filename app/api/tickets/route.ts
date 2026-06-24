// ─── น้องนาโน — Tickets API ──────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getNanoSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { getTicketWhereByRole } from "@/lib/tenant";
import { checkLimit } from "@/lib/plan-limits";
import { Role } from "@prisma/client";

// GET /api/tickets — ดึงรายการ ticket ตาม role
export async function GET(request: NextRequest) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const { tenantId, role, id: userId, departmentId } = session;

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const ticketType = searchParams.get("ticketType");
    const systemId = searchParams.get("systemId");
    const deptId = searchParams.get("departmentId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = getTicketWhereByRole(
      tenantId,
      role as Role,
      userId,
      departmentId
    );

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (ticketType) where.ticketType = ticketType;
    if (systemId) where.systemId = systemId;
    if (deptId && (role === "ADMIN" || role === "SUPER_ADMIN")) {
      where.departmentId = deptId;
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          createdBy: { select: { displayName: true, pictureUrl: true } },
          assignedTo: { select: { displayName: true, pictureUrl: true } },
          department: { select: { name: true } },
          category: { select: { name: true } },
          system: { select: { id: true, name: true, icon: true, color: true, code: true, ticketPrefix: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ticket.count({ where }),
    ]);

    return NextResponse.json({
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/tickets error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูล" },
      { status: 500 }
    );
  }
}

// POST /api/tickets — สร้าง ticket ใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const { tenantId, tenantPlan, id: userId } = session;
    const body = await request.json();

    // ตรวจสอบ plan limit
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyCount = await prisma.ticket.count({
      where: {
        tenantId,
        createdAt: { gte: startOfMonth },
      },
    });

    const limitCheck = checkLimit(tenantPlan, "tickets", monthlyCount);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message },
        { status: 403 }
      );
    }

    // หา ticket number ถัดไป — per system
    const ticketWhere: Record<string, unknown> = { tenantId };
    if (body.systemId) ticketWhere.systemId = body.systemId;

    const lastTicket = await prisma.ticket.findFirst({
      where: ticketWhere,
      orderBy: { ticketNo: "desc" },
      select: { ticketNo: true },
    });
    const nextTicketNo = (lastTicket?.ticketNo || 0) + 1;

    // ถ้ามี system → ดึง defaultAssignee
    let assignedToId = body.assignedToId || null;
    if (!assignedToId && body.systemId) {
      const system = await prisma.system.findUnique({
        where: { id: body.systemId },
        select: { defaultAssigneeId: true },
      });
      assignedToId = system?.defaultAssigneeId || null;
    }

    const ticket = await prisma.ticket.create({
      data: {
        tenantId,
        ticketNo: nextTicketNo,
        title: body.title,
        description: body.description,
        priority: body.priority || "MEDIUM",
        ticketType: body.ticketType || "BUG",
        categoryId: body.categoryId || null,
        departmentId: body.departmentId || null,
        systemId: body.systemId || null,
        createdById: userId,
        assignedToId,
      },
      include: {
        department: { select: { name: true } },
        category: { select: { name: true } },
        createdBy: { select: { displayName: true } },
        system: { select: { name: true, icon: true, ticketPrefix: true } },
      },
    });

    // สร้าง Audit Log
    const ticketDisplay = ticket.system
      ? `${ticket.system.ticketPrefix}-${ticket.ticketNo}`
      : `#${ticket.ticketNo}`;

    await prisma.auditLog.create({
      data: {
        tenantId,
        ticketId: ticket.id,
        userId,
        action: "CREATED",
        detail: `สร้าง Ticket ${ticketDisplay}: ${ticket.title}`,
      },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error("POST /api/tickets error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการสร้าง Ticket" },
      { status: 500 }
    );
  }
}
