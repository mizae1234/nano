// ─── น้องนาโน — Dev Login API (bypass NextAuth) ──────────────
// ใช้ได้เฉพาะ development mode เท่านั้น

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { SignJWT } from "jose";

async function doDevLogin(tenantSlug: string, role: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) return { error: `ไม่พบ tenant: ${tenantSlug}`, status: 404 };

  let user = await prisma.user.findFirst({ where: { tenantId: tenant.id, role: role as any } });
  if (!user) user = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        lineUid: `dev-${role.toLowerCase()}-${Date.now()}`,
        displayName: `${role} (Dev)`,
        role: role as any,
      },
    });
  }

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

  const cookieStore = await cookies();
  cookieStore.set("nano-session", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return {
    success: true,
    user: { id: user.id, displayName: user.displayName, role: user.role, tenantSlug: tenant.slug, tenantName: tenant.name },
  };
}

// GET — เปิดใน browser ได้เลย แล้ว redirect ไป /settings
// ตัวอย่าง: /api/auth/dev-login?tenant=demo&role=SUPER_ADMIN
export async function GET(req: NextRequest) {
  if (process.env.DEV_BYPASS_LOGIN !== "true") {
    return NextResponse.json({ error: "ไม่อนุญาตใน production" }, { status: 403 });
  }
  const tenantSlug = req.nextUrl.searchParams.get("tenant") || "demo";
  const role = req.nextUrl.searchParams.get("role") || "SUPER_ADMIN";
  try {
    const result = await doDevLogin(tenantSlug, role);
    if ("error" in result) return NextResponse.json(result, { status: result.status as number });
    return NextResponse.redirect(new URL("/settings", req.url));
  } catch (error) {
    console.error("Dev login error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// POST — เรียกจาก code
export async function POST(req: NextRequest) {
  if (process.env.DEV_BYPASS_LOGIN !== "true") {
    return NextResponse.json({ error: "ไม่อนุญาตใน production" }, { status: 403 });
  }
  const body = await req.json();
  const tenantSlug = body.tenantSlug || "demo";
  const role = body.role || "SUPER_ADMIN";
  try {
    const result = await doDevLogin(tenantSlug, role);
    if ("error" in result) return NextResponse.json(result, { status: result.status as number });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Dev login error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" }, { status: 500 });
  }
}
