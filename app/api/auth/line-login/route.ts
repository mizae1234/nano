// ─── น้องนาโน — LINE LIFF Login API ─────────────────────────
// รับ LINE Access Token จาก LIFF แล้วสร้าง session

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SignJWT } from "jose";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken, tenantSlug } = body;

    if (!accessToken || !tenantSlug) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วน" },
        { status: 400 }
      );
    }

    // ─── ดึงข้อมูล LINE Profile จาก Access Token ────────────
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileRes.ok) {
      return NextResponse.json(
        { error: "LINE access token ไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    const profile = await profileRes.json();
    const { userId: lineUid, displayName, pictureUrl } = profile;

    // ─── ตรวจสอบ Tenant ─────────────────────────────────────
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant || !tenant.isActive) {
      return NextResponse.json(
        { error: "ไม่พบองค์กรหรือองค์กรถูกระงับ" },
        { status: 404 }
      );
    }

    // ─── หา User หรือสร้างใหม่ ──────────────────────────────
    let user = await prisma.user.findUnique({
      where: {
        tenantId_lineUid: {
          tenantId: tenant.id,
          lineUid,
        },
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          lineUid,
          displayName,
          pictureUrl,
          role: "USER",
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { displayName, pictureUrl },
      });
    }

    // ─── สร้าง JWT Session ───────────────────────────────────
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
      secure: process.env.NODE_ENV === "production",
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
        pictureUrl: user.pictureUrl,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
      },
    });
  } catch (error) {
    console.error("LINE login error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" },
      { status: 500 }
    );
  }
}
