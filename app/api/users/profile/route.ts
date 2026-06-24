import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SignJWT } from "jose";
import prisma from "@/lib/prisma";
import { getNanoSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        displayName: true,
        employeeCode: true,
        departmentId: true,
        pictureUrl: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "ไม่พบข้อมูลผู้ใช้" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET profile error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูล" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const body = await req.json();
    const { displayName, employeeCode, departmentId } = body;

    if (!displayName) {
      return NextResponse.json({ error: "กรุณากรอกชื่อพนักงาน" }, { status: 400 });
    }

    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, tenantId: session.tenantId },
      });
      if (!dept) {
        return NextResponse.json({ error: "แผนกที่เลือกไม่ถูกต้อง" }, { status: 400 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: {
        displayName,
        employeeCode: employeeCode || null,
        departmentId: departmentId || null,
      },
      include: {
        tenant: true,
      },
    });

    // ─── อัปเดต JWT Session cookie ─────────────────────────
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "dev-secret-key-for-testing-only"
    );

    const token = await new SignJWT({
      id: updatedUser.id,
      tenantId: updatedUser.tenant.id,
      tenantSlug: updatedUser.tenant.slug,
      tenantPlan: updatedUser.tenant.plan,
      tenantDbMode: updatedUser.tenant.dbMode,
      departmentId: updatedUser.departmentId,
      role: updatedUser.role,
      displayName: updatedUser.displayName,
      pictureUrl: updatedUser.pictureUrl || undefined,
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

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("PATCH profile error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" }, { status: 500 });
  }
}
