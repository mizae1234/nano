// ─── น้องนาโน — Category Detail API ────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getNanoSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { hasMinRole } from "@/lib/tenant";
import { Role } from "@prisma/client";

// PATCH /api/categories/[id] — แก้ไข category
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
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const body = await request.json();
    const { name, departmentId } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "ไม่มีข้อมูลที่ต้องการแก้ไข" }, { status: 400 });
    }

    // ตรวจสอบชื่อซ้ำกรณีที่แก้ไขชื่อ
    if (name) {
      const category = await prisma.category.findUnique({
        where: { id: params.id },
      });
      if (!category) {
        return NextResponse.json({ error: "ไม่พบหมวดหมู่" }, { status: 404 });
      }

      const existing = await prisma.category.findFirst({
        where: {
          tenantId: session.tenantId,
          departmentId: departmentId !== undefined ? (departmentId || null) : category.departmentId,
          name: { equals: name, mode: "insensitive" },
          id: { not: params.id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "มีหมวดหมู่นี้อยู่แล้วในแผนกนี้" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.category.update({
      where: { id: params.id, tenantId: session.tenantId },
      data: updateData,
      include: {
        department: { select: { name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/categories/[id] error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการแก้ไขหมวดหมู่" },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] — ลบ category
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    if (!hasMinRole(session.role as Role, "ADMIN")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    // ลบหมวดหมู่ (Prisma จะตั้งค่า categoryId ใน Ticket เป็น null อัตโนมัติเนื่องจากเป็น optional relation)
    await prisma.category.delete({
      where: { id: params.id, tenantId: session.tenantId },
    });

    return NextResponse.json({ message: "ลบหมวดหมู่เรียบร้อยแล้ว" });
  } catch (error) {
    console.error("DELETE /api/categories/[id] error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการลบหมวดหมู่" },
      { status: 500 }
    );
  }
}
