// ─── น้องนาโน — Platform Tenants API ────────────────────────

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Simple platform admin auth check
async function verifyPlatformAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  // In production, this would verify a JWT token
  // For now, check against platform admin session
  return true;
}

// GET /api/platform/tenants
export async function GET(request: NextRequest) {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: { users: true, tickets: true, departments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tenants);
  } catch (error) {
    console.error("GET platform tenants error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// POST /api/platform/tenants — สร้าง tenant ใหม่
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ตรวจสอบ slug ซ้ำ
    const existing = await prisma.tenant.findUnique({
      where: { slug: body.slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Subdomain นี้ถูกใช้งานแล้ว" },
        { status: 409 }
      );
    }

    // สร้าง tenant
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const tenant = await prisma.tenant.create({
      data: {
        slug: body.slug.toLowerCase(),
        name: body.name,
        themeColor: body.themeColor || "#0066FF",
        plan: body.plan || "TRIAL",
        trialEndsAt: body.plan === "TRIAL" || !body.plan ? trialEndsAt : null,
        dbMode: "SHARED",
      },
    });

    // สร้าง default departments
    const generalDept = await prisma.department.create({
      data: {
        tenantId: tenant.id,
        name: "ทั่วไป",
      },
    });

    // สร้าง default categories
    const defaultCategories = [
      "ปัญหาอินเตอร์เน็ต",
      "ปัญหาคอมพิวเตอร์",
      "ปัญหาซอฟต์แวร์",
      "ปัญหาอีเมล",
      "ปัญหาเครื่องพิมพ์",
      "ปัญหาอุปกรณ์สำนักงาน",
      "อื่นๆ",
    ];

    for (const catName of defaultCategories) {
      await prisma.category.create({
        data: {
          tenantId: tenant.id,
          departmentId: generalDept.id,
          name: catName,
        },
      });
    }

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    console.error("POST platform tenant error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
