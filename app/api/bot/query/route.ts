// ─── น้องนาโน — Gemini Bot Query API ─────────────────────────

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getNanoSession } from "@/lib/session";
import { queryDatabase } from "@/lib/gemini";
import { checkLimit } from "@/lib/plan-limits";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";

// POST /api/bot/query
export async function POST(request: NextRequest) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    // ตรวจสอบ plan
    const aiCheck = checkLimit(session.tenantPlan, "aiBot");
    if (!aiCheck.allowed) {
      return NextResponse.json({ error: aiCheck.message }, { status: 403 });
    }

    const body = await request.json();
    if (!body.query?.trim()) {
      return NextResponse.json({ error: "กรุณาพิมพ์คำถาม" }, { status: 400 });
    }

    // ดึง bot config สำหรับ persona
    const botConfig = await prisma.botConfig.findUnique({
      where: { tenantId: session.tenantId },
      select: { botName: true, botPersona: true, systemPrompt: true, aiModel: true },
    });

    const answer = await queryDatabase(body.query, {
      tenantId: session.tenantId,
      userId: session.id,
      departmentId: session.departmentId,
      userRole: session.role as Role,
      botName: botConfig?.botName,
      botPersona: botConfig?.botPersona,
      systemPrompt: botConfig?.systemPrompt,
      aiModel: botConfig?.aiModel,
    });

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Bot query error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการประมวลผล" }, { status: 500 });
  }
}
