// ─── น้องนาโน — System Detail API ────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getNanoSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { hasMinRole } from "@/lib/tenant";
import { Role } from "@prisma/client";
import { encrypt } from "@/lib/encrypt";

// GET /api/systems/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const { id } = await params;
    const system = await prisma.system.findFirst({
      where: { id, tenantId: session.tenantId },
      include: {
        defaultAssignee: { select: { id: true, displayName: true, pictureUrl: true } },
      },
    });

    if (!system) {
      return NextResponse.json({ error: "ไม่พบระบบ" }, { status: 404 });
    }

    return NextResponse.json(system);
  } catch (error) {
    console.error("GET /api/systems/[id] error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// PATCH /api/systems/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    if (!hasMinRole(session.role as Role, "ADMIN")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    if (body.isDefault) {
      const target = await prisma.system.findUnique({ where: { id } });
      if (target) {
        await prisma.system.updateMany({
          where: { tenantId: target.tenantId },
          data: { isDefault: false },
        });
      }
    }

    const system = await prisma.system.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.icon !== undefined && { icon: body.icon }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.defaultAssigneeId !== undefined && { defaultAssigneeId: body.defaultAssigneeId }),
        ...(body.lineOaToken !== undefined && { lineOaToken: body.lineOaToken ? encrypt(body.lineOaToken) : null }),
        ...(body.lineOaSecret !== undefined && { lineOaSecret: body.lineOaSecret ? encrypt(body.lineOaSecret) : null }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
      },
    });

    return NextResponse.json(system);
  } catch (error) {
    console.error("PATCH /api/systems/[id] error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// DELETE /api/systems/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    if (!hasMinRole(session.role as Role, "ADMIN")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const { id } = await params;

    // ตรวจสอบจำนวน Ticket ที่ใช้ระบบนี้อยู่
    const ticketCount = await prisma.ticket.count({
      where: { systemId: id },
    });

    if (ticketCount > 0) {
      // มี Ticket ผูกอยู่ -> ทำ Soft Delete (Inactive)
      await prisma.system.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        success: true,
        message: `ระบบนี้มีตั๋วงานเชื่อมโยงอยู่ ${ticketCount} ใบ จึงทำการปิดใช้งาน (Inactive) แทนการลบถาวรเพื่อความปลอดภัยของข้อมูล`,
        softDeleted: true,
      });
    }

    // ไม่มี Ticket ผูกอยู่ -> ทำ Hard Delete ถาวร
    await prisma.system.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "ลบระบบถาวรเรียบร้อยแล้ว",
      softDeleted: false,
    });
  } catch (error) {
    console.error("DELETE /api/systems/[id] error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการลบระบบ" }, { status: 500 });
  }
}
