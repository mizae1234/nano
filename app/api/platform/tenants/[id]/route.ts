// ─── น้องนาโน — Platform Tenant Detail API ──────────────────

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/platform/tenants/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { users: true, tickets: true, departments: true } },
        departments: { select: { id: true, name: true, isActive: true } },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "ไม่พบ Tenant" }, { status: 404 });
    }

    const migrationLog = await prisma.migrationLog.findUnique({
      where: { tenantId: params.id },
    });

    return NextResponse.json({ ...tenant, migrationLog });
  } catch (error) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// PATCH /api/platform/tenants/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const tenant = await prisma.tenant.update({
      where: { id: params.id },
      data: {
        plan: body.plan,
        isActive: body.isActive,
        trialEndsAt: body.trialEndsAt ? new Date(body.trialEndsAt) : undefined,
      },
    });

    return NextResponse.json(tenant);
  } catch (error) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
