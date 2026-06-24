// ─── น้องนาโน — Gemini Bot Query API ─────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryDatabase } from "@/lib/gemini";
import { checkLimit } from "@/lib/plan-limits";
import { Role } from "@prisma/client";

// POST /api/bot/query
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    // ตรวจสอบ plan
    const aiCheck = checkLimit(session.user.tenantPlan, "aiBot");
    if (!aiCheck.allowed) {
      return NextResponse.json({ error: aiCheck.message }, { status: 403 });
    }

    const body = await request.json();
    if (!body.query?.trim()) {
      return NextResponse.json({ error: "กรุณาพิมพ์คำถาม" }, { status: 400 });
    }

    const answer = await queryDatabase(body.query, {
      tenantId: session.user.tenantId,
      departmentId: session.user.departmentId,
      userRole: session.user.role as Role,
    });

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Bot query error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการประมวลผล" },
      { status: 500 }
    );
  }
}
