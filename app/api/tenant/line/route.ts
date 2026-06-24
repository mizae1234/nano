// ─── น้องนาโน — LINE OA Connection API ──────────────────────

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getNanoSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { hasMinRole } from "@/lib/tenant";
import { encrypt } from "@/lib/encrypt";
import { testLineConnection } from "@/lib/line";
import { Role } from "@prisma/client";

// POST /api/tenant/line — เชื่อมต่อ LINE OA
export async function POST(request: NextRequest) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    if (!hasMinRole(session.role as Role, "SUPER_ADMIN")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const body = await request.json();
    const { channelAccessToken, channelSecret, testOnly } = body;

    if (!channelAccessToken || !channelSecret) {
      return NextResponse.json(
        { error: "กรุณากรอก Channel Access Token และ Channel Secret" },
        { status: 400 }
      );
    }

    // เข้ารหัสเพื่อทดสอบ
    const encryptedToken = encrypt(channelAccessToken);

    // ทดสอบการเชื่อมต่อ
    const testResult = await testLineConnection(encryptedToken);

    if (!testResult.success) {
      return NextResponse.json(
        { error: testResult.error || "ไม่สามารถเชื่อมต่อ LINE ได้" },
        { status: 400 }
      );
    }

    // ถ้าทดสอบอย่างเดียว ไม่บันทึก
    if (testOnly) {
      return NextResponse.json({
        success: true,
        botName: testResult.botName,
        message: `เชื่อมต่อ LINE OA สำเร็จ: ${testResult.botName}`,
      });
    }

    // บันทึก
    const encryptedSecret = encrypt(channelSecret);

    await prisma.tenant.update({
      where: { id: session.tenantId },
      data: {
        lineOaToken: encryptedToken,
        lineOaSecret: encryptedSecret,
      },
    });

    return NextResponse.json({
      success: true,
      botName: testResult.botName,
      message: `บันทึกการเชื่อมต่อ LINE OA สำเร็จ: ${testResult.botName}`,
    });
  } catch (error) {
    console.error("POST tenant line error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
