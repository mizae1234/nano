// ─── น้องนาโน — Ticket Detail API ────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getNanoSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { canAccessTicket, hasMinRole } from "@/lib/tenant";
import { Role } from "@prisma/client";

// GET /api/tickets/[id] — ดูรายละเอียด ticket
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const ticket = await prisma.ticket.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: {
        createdBy: { select: { id: true, displayName: true, pictureUrl: true } },
        assignedTo: { select: { id: true, displayName: true, pictureUrl: true } },
        department: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        comments: {
          include: {
            user: { select: { displayName: true, pictureUrl: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        auditLogs: {
          include: {
            user: { select: { displayName: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "ไม่พบ Ticket" }, { status: 404 });
    }

    // ตรวจสอบสิทธิ์
    if (
      !canAccessTicket(
        session.role as Role,
        session.id,
        session.departmentId,
        ticket
      )
    ) {
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์เข้าถึง Ticket นี้" },
        { status: 403 }
      );
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("GET /api/tickets/[id] error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}

// PATCH /api/tickets/[id] — อัปเดต ticket
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const ticket = await prisma.ticket.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });

    if (!ticket) {
      return NextResponse.json({ error: "ไม่พบ Ticket" }, { status: 404 });
    }

    // ต้องเป็น IT ขึ้นไปถึงจะแก้ไข ticket ได้
    if (!hasMinRole(session.role as Role, "IT")) {
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์แก้ไข Ticket" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    const auditDetails: string[] = [];

    if (body.status && body.status !== ticket.status) {
      updateData.status = body.status;
      auditDetails.push(`เปลี่ยนสถานะเป็น ${body.status}`);
      if (body.status === "RESOLVED") {
        updateData.resolvedAt = new Date();
      }
    }

    if (body.priority && body.priority !== ticket.priority) {
      updateData.priority = body.priority;
      auditDetails.push(`เปลี่ยนลำดับความสำคัญเป็น ${body.priority}`);
    }

    if (body.assignedToId !== undefined && body.assignedToId !== ticket.assignedToId) {
      updateData.assignedToId = body.assignedToId;
      if (body.assignedToId) {
        const assignee = await prisma.user.findUnique({
          where: { id: body.assignedToId },
          select: { displayName: true },
        });
        auditDetails.push(`มอบหมายให้ ${assignee?.displayName || "ไม่ทราบ"}`);
      } else {
        auditDetails.push("ยกเลิกการมอบหมาย");
      }
    }

    if (body.departmentId !== undefined && body.departmentId !== ticket.departmentId) {
      updateData.departmentId = body.departmentId;
      auditDetails.push("เปลี่ยนแผนก");
    }

    if (body.categoryId !== undefined) {
      updateData.categoryId = body.categoryId;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "ไม่มีข้อมูลที่ต้องอัปเดต" }, { status: 400 });
    }

    const updated = await prisma.ticket.update({
      where: { id: params.id },
      data: updateData,
      include: {
        createdBy: { select: { displayName: true } },
        assignedTo: { select: { displayName: true } },
        department: { select: { name: true } },
      },
    });

    // สร้าง Audit Log
    if (auditDetails.length > 0) {
      await prisma.auditLog.create({
        data: {
          tenantId: session.tenantId,
          ticketId: params.id,
          userId: session.id,
          action: "UPDATED",
          detail: auditDetails.join(", "),
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/tickets/[id] error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัปเดต" },
      { status: 500 }
    );
  }
}
