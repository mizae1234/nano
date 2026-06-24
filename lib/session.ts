// ─── น้องนาโน — Session Helper ───────────────────────────────
// อ่าน session จาก cookie (dev) หรือ NextAuth (prod)

import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { Plan, DbMode, Role } from "@prisma/client";

export interface NanoSession {
  id: string;
  tenantId: string;
  tenantSlug: string;
  tenantPlan: Plan;
  tenantDbMode: DbMode;
  departmentId: string | null;
  role: Role;
  displayName: string;
  pictureUrl?: string;
}

export async function getNanoSession(): Promise<NanoSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("nano-session")?.value;

    if (!token) return null;

    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "dev-secret-key-for-testing-only"
    );

    const { payload } = await jwtVerify(token, secret);

    return {
      id: payload.id as string,
      tenantId: payload.tenantId as string,
      tenantSlug: payload.tenantSlug as string,
      tenantPlan: payload.tenantPlan as Plan,
      tenantDbMode: payload.tenantDbMode as DbMode,
      departmentId: (payload.departmentId as string) || null,
      role: payload.role as Role,
      displayName: payload.displayName as string,
      pictureUrl: payload.pictureUrl as string | undefined,
    };
  } catch {
    return null;
  }
}
