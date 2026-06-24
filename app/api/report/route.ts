// ─── น้องนาโน — Report API ───────────────────────────────────

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hasMinRole } from "@/lib/tenant";
import { Role } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    if (!hasMinRole(session.user.role as Role, "ADMIN")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึงรายงาน" }, { status: 403 });
    }

    const { tenantId } = session.user;
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "month";
    const deptId = searchParams.get("departmentId");

    // คำนวณช่วงเวลา (Date filter)
    const now = new Date();
    let startDate = new Date();
    if (period === "week") {
      startDate.setDate(now.getDate() - 7);
    } else if (period === "quarter") {
      startDate.setDate(now.getDate() - 90);
    } else if (period === "year") {
      startDate.setDate(now.getDate() - 365);
    } else {
      // default: month (30 วัน)
      startDate.setDate(now.getDate() - 30);
    }

    // สร้าง dynamic where clause
    const where: Record<string, unknown> = {
      tenantId,
      createdAt: { gte: startDate },
    };

    if (deptId && deptId !== "all") {
      where.departmentId = deptId;
    }

    // ดึงข้อมูล Tickets ทั้งหมดในช่วงเวลานั้น
    const tickets = await prisma.ticket.findMany({
      where,
      select: {
        id: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        createdById: true,
        departmentId: true,
        categoryId: true,
      },
    });

    const totalTickets = tickets.length;

    // 1. คำนวณเวลาแก้ไขเฉลี่ย
    const resolvedTickets = tickets.filter(t => t.resolvedAt && (t.status === "RESOLVED" || t.status === "CLOSED"));
    let avgResolutionTimeHours = 0;
    if (resolvedTickets.length > 0) {
      const totalMs = resolvedTickets.reduce((sum, t) => {
        const diff = new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime();
        return sum + diff;
      }, 0);
      const avgMs = totalMs / resolvedTickets.length;
      avgResolutionTimeHours = parseFloat((avgMs / (1000 * 60 * 60)).toFixed(1)); // แปลงเป็นชั่วโมง ทศนิยม 1 ตำแหน่ง
    }

    // 2. คำนวณอัตราแก้ไขสำเร็จ (Resolved / Total * 100)
    const successRate = totalTickets > 0
      ? Math.round((resolvedTickets.length / totalTickets) * 100)
      : 0;

    // 3. จำนวนผู้แจ้งที่ไม่ซ้ำกัน
    const uniqueCreators = new Set(tickets.map(t => t.createdById)).size;

    // 4. สถิติเปรียบเทียบแต่ละแผนก
    const departments = await prisma.department.findMany({
      where: { tenantId },
      select: { id: true, name: true, description: true },
    });

    const deptStats = await Promise.all(
      departments.map(async (d) => {
        const dTickets = await prisma.ticket.findMany({
          where: {
            tenantId,
            departmentId: d.id,
            createdAt: { gte: startDate },
          },
          select: { id: true, status: true, createdAt: true, resolvedAt: true },
        });

        const total = dTickets.length;
        const open = dTickets.filter(t => t.status === "OPEN").length;
        const inProgress = dTickets.filter(t => t.status === "IN_PROGRESS").length;
        const resolved = dTickets.filter(t => t.status === "RESOLVED").length;
        const closed = dTickets.filter(t => t.status === "CLOSED").length;

        // เวลาเฉลี่ยต่อแผนก
        const dResolved = dTickets.filter(t => t.resolvedAt && (t.status === "RESOLVED" || t.status === "CLOSED"));
        let avgTimeStr = "0.0 ชม.";
        if (dResolved.length > 0) {
          const totalMs = dResolved.reduce((sum, t) => {
            return sum + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime());
          }, 0);
          const avgHours = totalMs / dResolved.length / (1000 * 60 * 60);
          avgTimeStr = `${avgHours.toFixed(1)} ชม.`;
        }

        return {
          name: d.name,
          total,
          open,
          inProgress,
          resolved,
          closed,
          avgTime: avgTimeStr,
        };
      })
    );

    // 5. หมวดหมู่ยอดนิยม
    const categories = await prisma.category.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });

    const categoryCounts = categories.map(cat => {
      const count = tickets.filter(t => t.categoryId === cat.id).length;
      const percentage = totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0;
      return {
        name: cat.name,
        count,
        percentage,
      };
    }).filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // เอา top 5

    // กรณีมีตั๋วที่ไม่มีหมวดหมู่
    const noCategoryCount = tickets.filter(t => !t.categoryId).length;
    if (noCategoryCount > 0 && categoryCounts.length < 5) {
      categoryCounts.push({
        name: "อื่นๆ / ไม่ระบุหมวดหมู่",
        count: noCategoryCount,
        percentage: totalTickets > 0 ? Math.round((noCategoryCount / totalTickets) * 100) : 0,
      });
      categoryCounts.sort((a, b) => b.count - a.count);
    }

    return NextResponse.json({
      stats: [
        { label: "Ticket ทั้งหมด", value: totalTickets.toString(), change: "+0%", color: "text-nano-600", bgColor: "bg-nano-50" },
        { label: "เวลาแก้ไขเฉลี่ย", value: `${avgResolutionTimeHours} ชม.`, change: "-0%", color: "text-emerald-600", bgColor: "bg-emerald-50" },
        { label: "อัตราแก้ไขสำเร็จ", value: `${successRate}%`, change: "+0%", color: "text-purple-600", bgColor: "bg-purple-50" },
        { label: "ผู้ใช้ที่แจ้ง", value: uniqueCreators.toString(), change: "+0", color: "text-amber-600", bgColor: "bg-amber-50" },
      ],
      deptStats,
      topCategories: categoryCounts,
    });
  } catch (error) {
    console.error("GET /api/report error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการดึงรายงานสถิติ" }, { status: 500 });
  }
}
