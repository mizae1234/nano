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

    if (!isFollowing) {
      // ยกเลิกการติดตาม
      await prisma.ticketFollower.deleteMany({
        where: {
          ticketId: params.id,
          userId: session.id,
        },
      });
      return NextResponse.json({ isFollowing: false });
    } else {
      // ติดตาม / อัปเดตการตั้งค่าการติดตาม
      const channel = notifyChannel === "GROUP" ? "GROUP" : "DIRECT";
      const groupId = channel === "GROUP" ? notifyGroupId : null;

      const follower = await prisma.ticketFollower.upsert({
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

      return NextResponse.json({
        isFollowing: true,
        notifyChannel: follower.notifyChannel,
        notifyGroupId: follower.notifyGroupId,
      });
    }
  } catch (error) {
    console.error("POST /api/tickets/[id]/follow error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัปเดตการติดตาม" },
      { status: 500 }
    );
  }
}
