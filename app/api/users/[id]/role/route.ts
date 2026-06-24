// ─── น้องนาโน — User Role API ────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getNanoSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { hasMinRole } from "@/lib/tenant";
import { Role } from "@prisma/client";

// PATCH /api/users/[id]/role
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    if (!hasMinRole(session.role as Role, "ADMIN")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เปลี่ยน Role" }, { status: 403 });
    }

    const body = await request.json();
    const newRole = body.role as Role;

    // ห้ามตั้ง SUPER_ADMIN ถ้าตัวเองไม่ใช่ SUPER_ADMIN
    if (newRole === "SUPER_ADMIN" && session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "เฉพาะผู้ดูแลสูงสุดเท่านั้นที่สามารถตั้งค่า SUPER_ADMIN ได้" },
        { status: 403 }
      );
    }

    const user = await prisma.user.update({
      where: { id: params.id, tenantId: session.tenantId },
      data: { role: newRole },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("PATCH user role error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
