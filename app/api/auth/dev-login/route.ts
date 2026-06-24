// ─── น้องนาโน — Dev Login API (bypass NextAuth) ──────────────
// ใช้ได้เฉพาะ development mode เท่านั้น

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { SignJWT } from "jose";

export async function POST(req: NextRequest) {
  // ป้องกัน production
  if (process.env.DEV_BYPASS_LOGIN !== "true") {
    return NextResponse.json({ error: "ไม่อนุญาต" }, { status: 403 });
  }

  const body = await req.json();
  const tenantSlug = body.tenantSlug || "demo";
  const role = body.role || "SUPER_ADMIN";

  try {
    // ดึง tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: `ไม่พบ tenant: ${tenantSlug}` },
        { status: 404 }
      );
    }

    // ดึง user ตาม role
    let user = await prisma.user.findFirst({
      where: { tenantId: tenant.id, role: role as any },
    });

    if (!user) {
      user = await prisma.user.findFirst({
        where: { tenantId: tenant.id },
      });
    }

    if (!user) {
      // สร้าง user ใหม่อัตโนมัติ (เหมือน LINE LIFF login)
      user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          lineUid: `dev-${role.toLowerCase()}-${Date.now()}`,
          displayName: `${role} (Dev)`,
          role: role as any,
        },
      });
    }

    // สร้าง JWT token
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "dev-secret-key-for-testing-only"
    );

    const token = await new SignJWT({
      id: user.id,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantPlan: tenant.plan,
      tenantDbMode: tenant.dbMode,
      departmentId: user.departmentId,
      role: user.role,
      displayName: user.displayName,
      pictureUrl: user.pictureUrl,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("nano-session", token, {
      httpOnly: true,
      secure: false, // dev mode
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        displayName: user.displayName,
        role: user.role,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
      },
    });
  } catch (error) {
    console.error("Dev login error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" },
      { status: 500 }
    );
  }
}
