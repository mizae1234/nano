// ─── น้องนาโน — User Department API ─────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hasMinRole } from "@/lib/tenant";
import { Role } from "@prisma/client";

// PATCH /api/users/[id]/department
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    if (!hasMinRole(session.user.role as Role, "DEPT_ADMIN")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const body = await request.json();

    const user = await prisma.user.update({
      where: { id: params.id, tenantId: session.user.tenantId },
      data: { departmentId: body.departmentId || null },
      include: { department: { select: { name: true } } },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("PATCH user department error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
