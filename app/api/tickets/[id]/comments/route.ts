// ─── น้องนาโน — Comments API ─────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getNanoSession } from "@/lib/session";
import prisma from "@/lib/prisma";

// GET /api/tickets/[id]/comments
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const comments = await prisma.ticketComment.findMany({
      where: {
        ticketId: params.id,
        ticket: { tenantId: session.tenantId },
      },
      include: {
        user: { select: { displayName: true, pictureUrl: true, role: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("GET comments error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// POST /api/tickets/[id]/comments
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.message?.trim()) {
      return NextResponse.json({ error: "กรุณาพิมพ์ข้อความ" }, { status: 400 });
    }

    // ตรวจสอบว่า ticket อยู่ใน tenant เดียวกัน
    const ticket = await prisma.ticket.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });

    if (!ticket) {
      return NextResponse.json({ error: "ไม่พบ Ticket" }, { status: 404 });
    }

    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: params.id,
        userId: session.id,
        message: body.message.trim(),
      },
      include: {
        user: { select: { displayName: true, pictureUrl: true, role: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        ticketId: params.id,
        userId: session.id,
        action: "COMMENTED",
        detail: body.message.trim().substring(0, 100),
      },
    });

    // ส่ง LINE push notification ให้ผู้ติดตามตั๋ว (ยกเว้นคนคอมเมนต์เอง)
    try {
      const followers = await prisma.ticketFollower.findMany({
        where: {
          ticketId: params.id,
          userId: { not: session.id },
        },
        include: {
          user: { select: { lineUid: true } },
        },
      });

      const tenant = await prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: { lineOaToken: true },
      });

      if (followers.length > 0 && tenant?.lineOaToken) {
        const system = ticket.systemId ? await prisma.system.findUnique({
          where: { id: ticket.systemId },
          select: { ticketPrefix: true },
        }) : null;
        
        const ticketRef = system?.ticketPrefix ? `${system.ticketPrefix}-${ticket.ticketNo}` : `#${ticket.ticketNo}`;
        const notifyMsg = `📢 ${ticketRef} มีความคิดเห็นใหม่จากคุณ ${comment.user.displayName}:\n"${comment.message.substring(0, 50)}${comment.message.length > 50 ? "..." : ""}"`;
        
        const { pushMessage } = await import("@/lib/line");
        for (const follower of followers) {
          try {
            if (follower.notifyChannel === "DIRECT" && follower.user.lineUid) {
              await pushMessage(tenant.lineOaToken, follower.user.lineUid, [
                { type: "text", text: notifyMsg } as any,
              ]);
            } else if (follower.notifyChannel === "GROUP" && follower.notifyGroupId) {
              const g = await prisma.groupConfig.findUnique({
                where: { id: follower.notifyGroupId },
                select: { lineGroupId: true },
              });
              if (g?.lineGroupId) {
                await pushMessage(tenant.lineOaToken, g.lineGroupId, [
                  { type: "text", text: notifyMsg } as any,
                ]);
              }
            }
          } catch (err) {
            console.error(`Failed to push comment notification to follower ${follower.id}:`, err);
          }
        }
      }
    } catch (err) {
      console.error("Error sending comment notifications to followers:", err);
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("POST comment error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
