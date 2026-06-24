// ─── น้องนาโน — Admin Broadcast API ────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getNanoSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { hasMinRole } from "@/lib/tenant";
import { Role } from "@prisma/client";
import { pushMessage } from "@/lib/line";

// POST /api/admin/broadcast — ส่ง Broadcast หา LINE Group หรือ User
export async function POST(request: NextRequest) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    // ต้องเป็น ADMIN ขึ้นไปเท่านั้น
    if (!hasMinRole(session.role as Role, "ADMIN")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ใช้งาน" }, { status: 403 });
    }

    const body = await request.json();
    const { messageText, targetType, targetIds } = body;

    if (!messageText?.trim()) {
      return NextResponse.json({ error: "กรุณาระบุข้อความที่ต้องการส่ง" }, { status: 400 });
    }

    if (targetType !== "GROUP" && targetType !== "USER") {
      return NextResponse.json({ error: "ประเภทเป้าหมายไม่ถูกต้อง" }, { status: 400 });
    }

    if (!Array.isArray(targetIds) || targetIds.length === 0) {
      return NextResponse.json({ error: "กรุณาเลือกผู้รับอย่างน้อย 1 รายการ" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { id: true, lineOaToken: true },
    });

    if (!tenant || !tenant.lineOaToken) {
      return NextResponse.json({ error: "ระบบยังไม่ได้เชื่อมต่อ LINE OA" }, { status: 400 });
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    if (targetType === "GROUP") {
      const groups = await prisma.groupConfig.findMany({
        where: {
          id: { in: targetIds },
          tenantId: tenant.id,
          isActive: true,
        },
        select: { id: true, lineGroupId: true, name: true },
      });

      for (const group of groups) {
        try {
          await pushMessage(tenant.lineOaToken, group.lineGroupId, [
            { type: "text", text: messageText } as any,
          ]);

          // บันทึก ChatLog (OUTGOING)
          await prisma.chatLog.create({
            data: {
              tenantId: tenant.id,
              lineUid: "SYSTEM",
              displayName: "📣 Broadcast Bot",
              lineGroupId: group.lineGroupId,
              messageText: messageText,
              direction: "OUTGOING",
              replyAction: "BROADCAST",
            },
          });

          successCount++;
        } catch (err: any) {
          console.error(`Failed to broadcast to group ${group.name} (${group.lineGroupId}):`, err);
          failCount++;
          errors.push(`${group.name}: ${err.message || "ส่งไม่สำเร็จ"}`);
        }
      }
    } else {
      const users = await prisma.user.findMany({
        where: {
          id: { in: targetIds },
          tenantId: tenant.id,
          lineUid: { not: "" },
        },
        select: { id: true, lineUid: true, displayName: true },
      });

      for (const user of users) {
        try {
          if (!user.lineUid) continue;

          await pushMessage(tenant.lineOaToken, user.lineUid, [
            { type: "text", text: messageText } as any,
          ]);

          // บันทึก ChatLog (OUTGOING)
          await prisma.chatLog.create({
            data: {
              tenantId: tenant.id,
              lineUid: user.lineUid,
              displayName: "📣 Broadcast Bot",
              lineGroupId: null,
              messageText: messageText,
              direction: "OUTGOING",
              replyAction: "BROADCAST",
            },
          });

          successCount++;
        } catch (err: any) {
          console.error(`Failed to broadcast to user ${user.displayName} (${user.lineUid}):`, err);
          failCount++;
          errors.push(`${user.displayName}: ${err.message || "ส่งไม่สำเร็จ"}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      successCount,
      failCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("POST /api/admin/broadcast error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการส่งข้อความ" }, { status: 500 });
  }
}
