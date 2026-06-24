// ─── น้องนาโน — Bot Config API ───────────────────────────────

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getNanoSession } from "@/lib/session";
import { hasMinRole } from "@/lib/tenant";
import { Role } from "@prisma/client";

// GET /api/bot/config — ดึง bot config ของ tenant
export async function GET() {
  const session = await getNanoSession();
  if (!session?.user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const config = await prisma.botConfig.findUnique({
    where: { tenantId: session.tenantId },
  });

  // return default ถ้าไม่มี config
  if (!config) {
    return NextResponse.json({
      botName: "น้องนาโน",
      botPersona: "ค่ะ",
      themeColor: "#0066FF",
      welcomeMessage: "สวัสดีค่ะ ยินดีต้อนรับสู่ระบบ Service Ticket 🎉\nพิมพ์ \"ช่วย\" เพื่อดูเมนูการใช้งานค่ะ",
      menuMessage: "เลือกสิ่งที่ต้องการค่ะ 😊",
      triggerWords: "นาโน,@นาโน,nano,@nano",
      systemPrompt: null,
      aiModel: "gemini-2.0-flash",
    });
  }

  return NextResponse.json(config);
}

// PUT /api/bot/config — บันทึก bot config
export async function PUT(request: NextRequest) {
  const session = await getNanoSession();
  if (!session?.user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  if (!hasMinRole(session.role as Role, "SUPER_ADMIN")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const body = await request.json();
  const {
    botName,
    botPersona,
    themeColor,
    welcomeMessage,
    menuMessage,
    triggerWords,
    systemPrompt,
    aiModel,
  } = body;

  const config = await prisma.botConfig.upsert({
    where: { tenantId: session.tenantId },
    update: {
      botName,
      botPersona,
      themeColor,
      welcomeMessage,
      menuMessage,
      triggerWords,
      systemPrompt: systemPrompt || null,
      aiModel,
    },
    create: {
      tenantId: session.tenantId,
      botName,
      botPersona,
      themeColor,
      welcomeMessage,
      menuMessage,
      triggerWords,
      systemPrompt: systemPrompt || null,
      aiModel,
    },
  });

  return NextResponse.json({ success: true, config });
}
