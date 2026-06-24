// ─── น้องนาโน — Tenant Utilities ─────────────────────────────

import prisma from "./prisma";
import { Plan, Role, Tenant } from "@prisma/client";
import { isTrialExpired } from "./plan-limits";

/**
 * ดึง tenant จาก slug (subdomain)
 * ใช้ใน middleware และ API routes
 */
export async function getTenantFromSlug(
  slug: string
): Promise<Tenant | null> {
  return prisma.tenant.findUnique({
    where: { slug },
  });
}

/**
 * ตรวจสอบว่า tenant ยังใช้งานได้หรือไม่
 * - ต้อง isActive = true
 * - ถ้าเป็น TRIAL ต้องยังไม่หมดอายุ
 */
export function isTenantAccessible(tenant: Tenant): {
  accessible: boolean;
  reason?: string;
} {
  if (!tenant.isActive) {
    return {
      accessible: false,
      reason: "องค์กรนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
    };
  }

  if (isTrialExpired(tenant.plan, tenant.trialEndsAt)) {
    return {
      accessible: false,
      reason: "ช่วงทดลองใช้งานสิ้นสุดแล้ว กรุณาอัปเกรดแผนเพื่อใช้งานต่อ",
    };
  }

  return { accessible: true };
}

/**
 * ตรวจสอบว่า role มีสิทธิ์เพียงพอหรือไม่
 * ลำดับสิทธิ์: USER < IT < DEPT_ADMIN < ADMIN < SUPER_ADMIN
 */
const ROLE_HIERARCHY: Record<Role, number> = {
  USER: 0,
  IT: 1,
  DEPT_ADMIN: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

export function hasMinRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * ตรวจสอบสิทธิ์การเข้าถึง ticket ตาม role
 */
export function canAccessTicket(
  userRole: Role,
  userId: string,
  userDeptId: string | null,
  ticket: {
    createdById: string;
    assignedToId: string | null;
    departmentId: string | null;
  }
): boolean {
  // ADMIN & SUPER_ADMIN เห็นทุก ticket ในองค์กร
  if (hasMinRole(userRole, "ADMIN")) return true;

  // DEPT_ADMIN เห็น ticket ใน dept ตัวเอง
  if (userRole === "DEPT_ADMIN" && userDeptId === ticket.departmentId) return true;

  // IT เห็น ticket ที่ assign ให้ตัวเอง
  if (userRole === "IT" && ticket.assignedToId === userId) return true;

  // USER เห็น ticket ที่ตัวเองสร้าง
  if (ticket.createdById === userId) return true;

  return false;
}

/**
 * สร้าง Prisma WHERE clause สำหรับ ticket query ตาม role
 */
export function getTicketWhereByRole(
  tenantId: string,
  role: Role,
  userId: string,
  departmentId: string | null
) {
  const base = { tenantId };

  switch (role) {
    case "SUPER_ADMIN":
    case "ADMIN":
      return base;

    case "DEPT_ADMIN":
      return { ...base, departmentId: departmentId || undefined };

    case "IT":
      return { ...base, assignedToId: userId, departmentId: departmentId || undefined };

    case "USER":
    default:
      return { ...base, createdById: userId };
  }
}

/**
 * Resolve tenant จาก request (ใช้ query param ตอน dev, subdomain ตอน prod)
 */
export function resolveTenantSlug(
  hostname: string,
  searchParams?: URLSearchParams
): string | null {
  // Dev mode: ใช้ query param ?tenant=slug
  if (process.env.NODE_ENV === "development" && searchParams?.get("tenant")) {
    return searchParams.get("tenant");
  }

  // Production: ใช้ subdomain
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "nanoticket.app";
  if (hostname.endsWith(`.${appDomain}`)) {
    const slug = hostname.replace(`.${appDomain}`, "");
    if (slug && !slug.includes(".")) {
      return slug;
    }
  }

  // Default dev tenant
  if (process.env.NODE_ENV === "development") {
    return process.env.DEV_TENANT_SLUG || "demo";
  }

  return null;
}
