// ─── น้องนาโน — Thai Labels ───────────────────────────────────

import { TicketStatus, Priority, Role, Plan, TicketType } from "@prisma/client";

export const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "เปิด",
  IN_PROGRESS: "กำลังดำเนินการ",
  PENDING: "รอข้อมูล",
  RESOLVED: "แก้ไขแล้ว",
  CLOSED: "ปิด",
};

export const STATUS_COLOR: Record<TicketStatus, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  PENDING: "bg-purple-100 text-purple-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-gray-100 text-gray-600",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "ต่ำ",
  MEDIUM: "ปานกลาง",
  HIGH: "สูง",
  URGENT: "ด่วนมาก",
};

export const PRIORITY_COLOR: Record<Priority, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700",
};

export const PRIORITY_ICON_COLOR: Record<Priority, string> = {
  LOW: "text-gray-400",
  MEDIUM: "text-blue-500",
  HIGH: "text-amber-500",
  URGENT: "text-red-500",
};

export const ROLE_LABEL: Record<Role, string> = {
  USER: "ผู้ใช้งาน",
  IT: "เจ้าหน้าที่ IT",
  DEPT_ADMIN: "หัวหน้าแผนก",
  ADMIN: "ผู้ดูแลระบบ",
  SUPER_ADMIN: "ผู้ดูแลสูงสุด",
};

export const ROLE_COLOR: Record<Role, string> = {
  USER: "bg-gray-100 text-gray-600",
  IT: "bg-cyan-100 text-cyan-700",
  DEPT_ADMIN: "bg-purple-100 text-purple-700",
  ADMIN: "bg-amber-100 text-amber-700",
  SUPER_ADMIN: "bg-red-100 text-red-700",
};

export const PLAN_LABEL: Record<Plan, string> = {
  TRIAL: "ทดลองใช้",
  STARTER: "Starter",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

export const PLAN_COLOR: Record<Plan, string> = {
  TRIAL: "bg-gray-100 text-gray-600",
  STARTER: "bg-blue-100 text-blue-700",
  PRO: "bg-purple-100 text-purple-700",
  ENTERPRISE: "bg-amber-100 text-amber-700",
};

export const PLAN_PRICE: Record<Plan, string> = {
  TRIAL: "ฟรี 14 วัน",
  STARTER: "฿990/เดือน",
  PRO: "฿2,990/เดือน",
  ENTERPRISE: "ติดต่อทีมงาน",
};

// ─── TicketType ────────────────────────────────────────────

export const TICKET_TYPE_LABEL: Record<TicketType, string> = {
  BUG: "ปัญหาระบบ",
  FEATURE: "ขอฟีเจอร์",
  TASK: "งานทั่วไป",
  QUESTION: "คำถาม",
};

export const TICKET_TYPE_COLOR: Record<TicketType, string> = {
  BUG: "bg-red-100 text-red-700",
  FEATURE: "bg-emerald-100 text-emerald-700",
  TASK: "bg-blue-100 text-blue-700",
  QUESTION: "bg-purple-100 text-purple-700",
};

export const TICKET_TYPE_ICON: Record<TicketType, string> = {
  BUG: "🐛",
  FEATURE: "✨",
  TASK: "📋",
  QUESTION: "❓",
};

// ─── ข้อความทั่วไป ────────────────────────────────────────

export const COMMON_LABELS = {
  appName: "น้องนาโน",
  appTagline: "ระบบ Service Ticket อัจฉริยะ สำหรับองค์กรไทย",
  loading: "กำลังโหลด...",
  saving: "กำลังบันทึก...",
  saved: "บันทึกแล้ว",
  error: "เกิดข้อผิดพลาด",
  success: "สำเร็จ",
  confirm: "ยืนยัน",
  cancel: "ยกเลิก",
  delete: "ลบ",
  edit: "แก้ไข",
  create: "สร้าง",
  save: "บันทึก",
  search: "ค้นหา",
  filter: "กรอง",
  all: "ทั้งหมด",
  noData: "ไม่มีข้อมูล",
  back: "กลับ",
  next: "ถัดไป",
  previous: "ก่อนหน้า",
  close: "ปิด",
  upgrade: "อัปเกรด",
  upgradeRequired: "กรุณาอัปเกรดแผนเพื่อใช้งานฟีเจอร์นี้",
  trialExpired: "ทดลองใช้งานหมดอายุแล้ว",
  unauthorized: "ไม่มีสิทธิ์เข้าถึง",
  notFound: "ไม่พบข้อมูล",
} as const;

// ─── เมนู Sidebar ─────────────────────────────────────────

export const MENU_LABELS = {
  myTickets: "ปัญหาของฉัน",
  newTicket: "แจ้งปัญหาใหม่",
  itQueue: "คิวงาน IT",
  deptTickets: "Ticket ในแผนก",
  deptMembers: "สมาชิกในแผนก",
  allTickets: "ทุก Ticket",
  manageUsers: "จัดการผู้ใช้",
  manageDepts: "จัดการแผนก",
  manageCategories: "จัดการหมวดหมู่",
  reports: "รายงานและสถิติ",
  settings: "ตั้งค่าระบบ",
  platform: "แดชบอร์ดผู้ให้บริการ",
} as const;
