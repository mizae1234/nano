// ─── น้องนาโน — Comments API ─────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/tickets/[id]/comments
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const comments = await prisma.ticketComment.findMany({
      where: {
        ticketId: params.id,
        ticket: { tenantId: session.user.tenantId },
      },
      include: {
        user: { select: { displayName: true, pictureUrl: true, role: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("GET comments error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// POST /api/tickets/[id]/comments
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.message?.trim()) {
      return NextResponse.json({ error: "กรุณาพิมพ์ข้อความ" }, { status: 400 });
    }

    // ตรวจสอบว่า ticket อยู่ใน tenant เดียวกัน
    const ticket = await prisma.ticket.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
    });

    if (!ticket) {
      return NextResponse.json({ error: "ไม่พบ Ticket" }, { status: 404 });
    }

    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: params.id,
        userId: session.user.id,
        message: body.message.trim(),
      },
      include: {
        user: { select: { displayName: true, pictureUrl: true, role: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId: session.user.tenantId,
        ticketId: params.id,
        userId: session.user.id,
        action: "COMMENTED",
        detail: body.message.trim().substring(0, 100),
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("POST comment error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
