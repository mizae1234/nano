// ─── น้องนาโน — Plan Limits & Guards ─────────────────────────

import { Plan } from "@prisma/client";

export interface PlanLimit {
  maxUsers: number | null;
  maxTicketsPerMonth: number | null;
  aiBot: boolean;
  departments: number | null;
}

export const PLAN_LIMITS: Record<Plan, PlanLimit> = {
  TRIAL: {
    maxUsers: 10,
    maxTicketsPerMonth: 100,
    aiBot: false,
    departments: 2,
  },
  STARTER: {
    maxUsers: 20,
    maxTicketsPerMonth: 500,
    aiBot: false,
    departments: 5,
  },
  PRO: {
    maxUsers: null,
    maxTicketsPerMonth: null,
    aiBot: true,
    departments: null,
  },
  ENTERPRISE: {
    maxUsers: null,
    maxTicketsPerMonth: null,
    aiBot: true,
    departments: null,
  },
};

export type LimitType = "users" | "tickets" | "departments" | "aiBot";

interface CheckLimitResult {
  allowed: boolean;
  message?: string;
  current?: number;
  limit?: number | null;
}

/**
 * ตรวจสอบว่า tenant ยังใช้งานได้ตาม plan limit หรือไม่
 */
export function checkLimit(
  plan: Plan,
  type: LimitType,
  currentCount: number = 0
): CheckLimitResult {
  const limits = PLAN_LIMITS[plan];

  switch (type) {
    case "users": {
      if (limits.maxUsers === null) return { allowed: true };
      if (currentCount >= limits.maxUsers) {
        return {
          allowed: false,
          message: `แผน ${plan} รองรับผู้ใช้สูงสุด ${limits.maxUsers} คน กรุณาอัปเกรดแผนเพื่อเพิ่มผู้ใช้`,
          current: currentCount,
          limit: limits.maxUsers,
        };
      }
      return { allowed: true, current: currentCount, limit: limits.maxUsers };
    }

    case "tickets": {
      if (limits.maxTicketsPerMonth === null) return { allowed: true };
      if (currentCount >= limits.maxTicketsPerMonth) {
        return {
          allowed: false,
          message: `แผน ${plan} รองรับ Ticket สูงสุด ${limits.maxTicketsPerMonth} รายการ/เดือน กรุณาอัปเกรดแผนเพื่อใช้งานต่อ`,
          current: currentCount,
          limit: limits.maxTicketsPerMonth,
        };
      }
      return {
        allowed: true,
        current: currentCount,
        limit: limits.maxTicketsPerMonth,
      };
    }

    case "departments": {
      if (limits.departments === null) return { allowed: true };
      if (currentCount >= limits.departments) {
        return {
          allowed: false,
          message: `แผน ${plan} รองรับแผนกสูงสุด ${limits.departments} แผนก กรุณาอัปเกรดแผนเพื่อเพิ่มแผนก`,
          current: currentCount,
          limit: limits.departments,
        };
      }
      return { allowed: true, current: currentCount, limit: limits.departments };
    }

    case "aiBot": {
      if (!limits.aiBot) {
        return {
          allowed: false,
          message:
            "ฟีเจอร์ AI น้องนาโนใช้งานได้เฉพาะแผน Pro ขึ้นไป กรุณาอัปเกรดแผนเพื่อใช้งานฟีเจอร์นี้",
        };
      }
      return { allowed: true };
    }

    default:
      return { allowed: true };
  }
}

/**
 * ตรวจสอบว่า Trial หมดอายุหรือยัง
 */
export function isTrialExpired(
  plan: Plan,
  trialEndsAt: Date | null
): boolean {
  if (plan !== "TRIAL") return false;
  if (!trialEndsAt) return false;
  return new Date() > trialEndsAt;
}

/**
 * คำนวณวันที่เหลือของ Trial
 */
export function trialDaysRemaining(trialEndsAt: Date | null): number {
  if (!trialEndsAt) return 0;
  const diff = trialEndsAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
