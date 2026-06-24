// ─── น้องนาโน — Group Detail API ─────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hasMinRole } from "@/lib/tenant";
import { Role } from "@prisma/client";

// PATCH /api/groups/[id] — แก้ไข GroupConfig + เปลี่ยน systems
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    if (!hasMinRole(session.user.role as Role, "ADMIN")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // อัพเดท GroupConfig
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    if (Object.keys(updateData).length > 0) {
      await prisma.groupConfig.update({ where: { id }, data: updateData });
    }

    // ถ้ามี systemIds → ลบ relations เดิม แล้วสร้างใหม่
    if (body.systemIds !== undefined) {
      await prisma.groupSystem.deleteMany({ where: { groupConfigId: id } });

      if (body.systemIds.length > 0) {
        await prisma.groupSystem.createMany({
          data: body.systemIds.map((sid: string) => ({
            groupConfigId: id,
            systemId: sid,
          })),
        });
      }
    }

    // ดึง group ที่อัพเดทแล้ว
    const group = await prisma.groupConfig.findUnique({
      where: { id },
      include: {
        groupSystems: {
          include: {
            system: { select: { id: true, name: true, icon: true, code: true } },
          },
        },
      },
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error("PATCH /api/groups/[id] error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// DELETE /api/groups/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    if (!hasMinRole(session.user.role as Role, "ADMIN")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.groupConfig.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/groups/[id] error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
