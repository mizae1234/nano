import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getNanoSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // SUPER_ADMIN only
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const page = parseInt(searchParams.get("page") || "1");
    const lineUid = searchParams.get("lineUid");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {
      tenantId: session.tenantId,
      direction: "INCOMING", // ดึงเฉพาะข้อความเข้าจากผู้ใช้เป็นเกณฑ์สำหรับการทำ Pagination
    };
    if (lineUid) where.lineUid = lineUid;
    if (search) {
      where.OR = [
        { messageText: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [incomingLogs, total] = await Promise.all([
      prisma.chatLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.chatLog.count({ where }),
    ]);

    // สืบค้นข้อความตอบกลับของบอท (OUTGOING) สำหรับแต่ละคำถามขาเข้า
    const pairedLogs = await Promise.all(
      incomingLogs.map(async (log) => {
        const outgoing = await prisma.chatLog.findFirst({
          where: {
            tenantId: session.tenantId,
            direction: "OUTGOING",
            lineUid: log.lineUid,
            lineGroupId: log.lineGroupId || null,
            createdAt: {
              gte: log.createdAt,
              lte: new Date(log.createdAt.getTime() + 10 * 1000), // บอทมักตอบกลับใน 10 วินาที
            },
          },
          orderBy: { createdAt: "asc" }, // ดึงข้อความตอบกลับลำดับแรกสุด
        });

        return {
          id: log.id,
          lineUid: log.lineUid,
          displayName: log.displayName,
          lineGroupId: log.lineGroupId,
          messageText: log.messageText, // ข้อความจากผู้ใช้
          botResponse: outgoing?.messageText || null, // คำตอบของบอท
          replyAction: outgoing?.replyAction || log.replyAction,
          createdAt: log.createdAt,
        };
      })
    );

    return NextResponse.json({
      logs: pairedLogs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("ChatLog API error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
