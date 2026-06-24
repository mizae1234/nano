// ─── น้องนาโน — Department Detail API ────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hasMinRole } from "@/lib/tenant";
import { Role } from "@prisma/client";

// PATCH /api/departments/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    if (!hasMinRole(session.user.role as Role, "ADMIN")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const body = await request.json();

    const department = await prisma.department.update({
      where: { id: params.id, tenantId: session.user.tenantId },
      data: {
        name: body.name,
        description: body.description,
        isActive: body.isActive,
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    console.error("PATCH department error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// DELETE /api/departments/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    if (!hasMinRole(session.user.role as Role, "ADMIN")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    // Soft delete — ปิดแทนลบ
    await prisma.department.update({
      where: { id: params.id, tenantId: session.user.tenantId },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "ปิดแผนกเรียบร้อยแล้ว" });
  } catch (error) {
    console.error("DELETE department error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
