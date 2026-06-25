import { NextRequest, NextResponse } from "next/server";
import { getNanoSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { canAccessTicket } from "@/lib/tenant";
import { Role } from "@prisma/client";

// GET /api/tickets/[id]/follow - ดึงข้อมูลสถานะการติดตามตั๋วของผู้ใช้ปัจจุบัน
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const ticket = await prisma.ticket.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });

    if (!ticket) {
      return NextResponse.json({ error: "ไม่พบ Ticket" }, { status: 404 });
    }

    // ตรวจสอบสิทธิ์การเข้าถึง Ticket
    if (
      !canAccessTicket(
        session.role as Role,
        session.id,
        session.departmentId,
        ticket
      )
    ) {
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์เข้าถึง Ticket นี้" },
        { status: 403 }
      );
    }

    const follower = await prisma.ticketFollower.findUnique({
      where: {
        ticketId_userId: {
          ticketId: params.id,
          userId: session.id,
        },
      },
    });

    return NextResponse.json({
      isFollowing: !!follower,
      notifyChannel: follower?.notifyChannel || "DIRECT",
      notifyGroupId: follower?.notifyGroupId || null,
    });
  } catch (error) {
    console.error("GET /api/tickets/[id]/follow error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลการติดตาม" },
      { status: 500 }
    );
  }
}

// POST /api/tickets/[id]/follow - อัปเดต/ยกเลิกการติดตามตั๋ว
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const ticket = await prisma.ticket.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: {
        createdBy: { select: { displayName: true } },
        assignedTo: { select: { displayName: true } },
        department: { select: { name: true } },
        system: { select: { name: true, icon: true, ticketPrefix: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "ไม่พบ Ticket" }, { status: 404 });
    }

    // ตรวจสอบสิทธิ์การเข้าถึง Ticket
    if (
      !canAccessTicket(
        session.role as Role,
        session.id,
        session.departmentId,
        ticket
      )
    ) {
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์เข้าถึง Ticket นี้" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { isFollowing, notifyChannel, notifyGroupId } = body;
    const channel = notifyChannel === "GROUP" ? "GROUP" : "DIRECT";
    const groupId = channel === "GROUP" ? notifyGroupId : null;

    if (!isFollowing) {
      // ยกเลิกการติดตาม
      await prisma.ticketFollower.deleteMany({
        where: {
          ticketId: params.id,
          userId: session.id,
        },
      });
    } else {
      // ติดตาม / อัปเดตการตั้งค่าการติดตาม
      await prisma.ticketFollower.upsert({
        where: {
          ticketId_userId: {
            ticketId: params.id,
            userId: session.id,
          },
        },
        create: {
          ticketId: params.id,
          userId: session.id,
          notifyChannel: channel,
          notifyGroupId: groupId,
        },
        update: {
          notifyChannel: channel,
          notifyGroupId: groupId,
        },
      });
    }

    // หลังจากบันทึกใน DB สำเร็จ ให้ส่ง LINE push notification ยืนยันการติดตาม
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: { lineOaToken: true },
      });

      if (tenant?.lineOaToken) {
        const ticketRef = ticket.system?.ticketPrefix
          ? `${ticket.system.ticketPrefix}-${ticket.ticketNo}`
          : `#${ticket.ticketNo}`;

        const botConfig = await prisma.botConfig.findUnique({
          where: { tenantId: session.tenantId },
          select: { botName: true, botPersona: true, themeColor: true },
        });
        const botMeta = {
          botName: botConfig?.botName,
          botPersona: botConfig?.botPersona,
          themeColor: botConfig?.themeColor || "#0066FF",
        };

        const { followTicketFlex } = await import("@/lib/nano-reply");
        const { pushMessage } = await import("@/lib/line");

        const ticketInfo = {
          id: ticket.id,
          ticketNo: ticket.ticketNo,
          title: ticket.title,
          status: ticket.status,
          priority: ticket.priority,
          ticketType: ticket.ticketType,
          departmentName: ticket.department?.name || undefined,
          assignedToName: ticket.assignedTo?.displayName || undefined,
          createdByName: ticket.createdBy.displayName,
          systemName: ticket.system?.name || undefined,
          systemIcon: ticket.system?.icon || undefined,
          systemPrefix: ticket.system?.ticketPrefix || undefined,
          createdAt: ticket.createdAt.toLocaleDateString("th-TH"),
          dueDate: ticket.dueDate ? ticket.dueDate.toLocaleDateString("th-TH") : undefined,
        };

        const flexMsg = followTicketFlex(ticketInfo, isFollowing, botMeta);

        if (!isFollowing) {
          // กรณีเลิกติดตาม: ส่งไปที่ DIRECT ของตนเองหากมี lineUid เพื่อยืนยัน
          const userRecord = await prisma.user.findUnique({
            where: { id: session.id },
            select: { lineUid: true },
          });
          if (userRecord?.lineUid) {
            await pushMessage(tenant.lineOaToken, userRecord.lineUid, [
              flexMsg as any,
            ]);
          }
        } else {
          // กรณีเริ่มติดตาม: ส่งไปช่องทางที่เลือก (DIRECT หรือ GROUP)
          if (channel === "DIRECT") {
            const userRecord = await prisma.user.findUnique({
              where: { id: session.id },
              select: { lineUid: true },
            });
            if (userRecord?.lineUid) {
              await pushMessage(tenant.lineOaToken, userRecord.lineUid, [
                flexMsg as any,
              ]);
            }
          } else if (channel === "GROUP" && groupId) {
            const g = await prisma.groupConfig.findUnique({
              where: { id: groupId },
              select: { lineGroupId: true },
            });
            if (g?.lineGroupId) {
              await pushMessage(tenant.lineOaToken, g.lineGroupId, [
                flexMsg as any,
              ]);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to send follow confirmation notification:", err);
    }

    return NextResponse.json({
      isFollowing,
      notifyChannel: channel,
      notifyGroupId: groupId,
    });
  } catch (error) {
    console.error("POST /api/tickets/[id]/follow error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัปเดตการติดตาม" },
      { status: 500 }
    );
  }
}
