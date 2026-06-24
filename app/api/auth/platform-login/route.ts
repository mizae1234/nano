// ─── น้องนาโน — Platform Admin Login API ─────────────────────

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "กรุณากรอกอีเมลและรหัสผ่าน" }, { status: 400 });
    }

    const admin = await prisma.platformAdmin.findUnique({ where: { email } });

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return NextResponse.json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }

    // สร้าง JWT สำหรับ platform admin
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "dev-secret-key-for-testing-only"
    );

    const token = await new SignJWT({
      id: admin.id,
      email: admin.email,
      isPlatformAdmin: true,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("8h")
      .sign(secret);

    const response = NextResponse.json({ success: true });
    response.cookies.set("platform-session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 ชั่วโมง
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Platform login error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
