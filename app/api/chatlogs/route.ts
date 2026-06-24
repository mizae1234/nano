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
    const direction = searchParams.get("direction");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {
      tenantId: session.tenantId,
    };
    if (lineUid) where.lineUid = lineUid;
    if (direction) where.direction = direction;
    if (search) {
      where.OR = [
        { messageText: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.chatLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.chatLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("ChatLog API error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
