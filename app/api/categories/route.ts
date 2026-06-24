// ─── น้องนาโน — Categories API ────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hasMinRole } from "@/lib/tenant";
import { Role } from "@prisma/client";

// GET /api/categories — ดึงรายการ category ของ tenant
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const { tenantId } = session.user;
    const searchParams = request.nextUrl.searchParams;
    const departmentId = searchParams.get("departmentId");

    const where: Record<string, unknown> = { tenantId };

    if (departmentId) {
      // ดึงของแผนกที่เลือก OR ของแผนกทั่วไป (null)
      where.OR = [
        { departmentId: departmentId },
        { departmentId: null }
      ];
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่" },
      { status: 500 }
    );
  }
}

// POST /api/categories — สร้าง category ใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    if (!hasMinRole(session.user.role as Role, "ADMIN")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const body = await request.json();
    const { name, departmentId } = body;

    if (!name) {
      return NextResponse.json({ error: "กรุณาระบุชื่อหมวดหมู่" }, { status: 400 });
    }

    // ตรวจสอบชื่อซ้ำภายใต้ tenant & department เดียวกัน
    const existing = await prisma.category.findFirst({
      where: {
        tenantId: session.user.tenantId,
        departmentId: departmentId || null,
        name: { equals: name, mode: "insensitive" },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "มีหมวดหมู่นี้อยู่แล้วในแผนกนี้" },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        tenantId: session.user.tenantId,
        name,
        departmentId: departmentId || null,
      },
      include: {
        department: { select: { name: true } },
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("POST /api/categories error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการสร้างหมวดหมู่" },
      { status: 500 }
    );
  }
}
