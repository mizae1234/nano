// ─── น้องนาโน — Smart Command Router ─────────────────────────
// รองรับภาษาธรรมชาติ, greeting, ticket creation, status check

import { Plan } from "@prisma/client";

// Trigger words สำหรับ group chat
const TRIGGERS = ["นาโน", "@นาโน", "nano", "@nano"];

export type NanoAction =
  | { action: "CREATE_TICKET"; text: string; systemCode?: string }
  | { action: "LIST_TICKETS"; systemCode?: string }
  | { action: "CHECK_STATUS"; ticketNo: string; systemPrefix?: string }
  | { action: "SHOW_SYSTEMS" }
  | { action: "GREETING" }
  | { action: "SHOW_MENU" }
  | { action: "GEMINI_QUERY"; query: string }
  | { action: "UPGRADE_REQUIRED" }
  | null;

// ─── Keyword Banks ────────────────────────────────────────────
const GREETING_WORDS = ["สวัสดี", "หวัดดี", "ดีจ้า", "ดีครับ", "ดีค่ะ", "hi", "hello", "hey", "yo"];
const MENU_WORDS = ["เมนู", "menu", "help", "ช่วย", "ทำอะไรได้", "ใช้ยังไง", "วิธีใช้", "คำสั่ง"];
const SYSTEMS_WORDS = ["ระบบอะไรบ้าง", "มีระบบ", "ระบบที่รองรับ", "แจ้งระบบ", "แจ้งได้กี่ระบบ", "ระบบอะไร"];
const LIST_TICKET_WORDS = ["ดูตั๋ว", "ตั๋วของฉัน", "ticket ของฉัน", "ติดตามตั๋ว", "งานของฉัน"];
const STATUS_WORDS = ["สถานะ", "status", "ตรวจสอบ"];
const CREATE_WORDS = ["แจ้ง", "แจ้งปัญหา", "report", "สร้าง ticket", "สร้างตั๋ว", "ขอแจ้ง"];

/**
 * แยก system code จากข้อความ
 * รองรับ: [hris], HRIS, HRS, hris
 */
function extractSystemCode(text: string): { systemCode?: string; cleanText: string } {
  // [code] format
  const bracketMatch = text.match(/\[([a-zA-Z0-9_-]+)\]/);
  if (bracketMatch) {
    return { systemCode: bracketMatch[1].toLowerCase(), cleanText: text.replace(bracketMatch[0], "").trim() };
  }
  // CODE ข้อความ เช่น "HRIS คอมค้าง" หรือ "HRS-001 ปัญหา"
  const codeFirst = text.match(/^([A-Z]{2,8})\s+(.+)/i);
  if (codeFirst) {
    return { systemCode: codeFirst[1].toLowerCase(), cleanText: codeFirst[2].trim() };
  }
  return { cleanText: text };
}

/**
 * ตรวจสอบว่าข้อความ include keyword ใดๆ จาก list
 */
function includes(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

/**
 * ตรวจสอบว่าข้อความ startsWith keyword ใดๆ จาก list
 */
function startsWith(text: string, keywords: string[]): { match: boolean; keyword: string } {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (lower.startsWith(kw.toLowerCase())) return { match: true, keyword: kw };
  }
  return { match: false, keyword: "" };
}

/**
 * วิเคราะห์ข้อความจาก LINE แล้วแปลงเป็น NanoAction
 *
 * Priority:
 * 1. แจ้ง / แจ้งปัญหา → CREATE_TICKET
 * 2. ดูตั๋ว / ตั๋วของฉัน → LIST_TICKETS
 * 3. สถานะ → CHECK_STATUS
 * 4. ระบบมีอะไรบ้าง → SHOW_SYSTEMS
 * 5. สวัสดี / greeting → GREETING
 * 6. เมนู / help → SHOW_MENU
 * 7. PRO/ENTERPRISE → GEMINI_QUERY
 * 8. อื่นๆ → SHOW_MENU
 */
export function parseNanoCommand(
  message: string,
  sourceType: "user" | "group" | "room",
  plan: Plan
): NanoAction {
  let text = message.trim();

  // ─── Group/Room: ต้องมี trigger word ──────────────────────
  if (sourceType !== "user") {
    const trigger = TRIGGERS.find((t) => text.toLowerCase().startsWith(t.toLowerCase()));
    if (!trigger) return null;
    text = text.slice(trigger.length).trim();
  }

  // ถ้าไม่มีข้อความหลัง trigger → แสดงเมนู
  if (!text) return { action: "SHOW_MENU" };

  // ─── 1. แจ้ง / แจ้งปัญหา ──────────────────────────────────
  const createCheck = startsWith(text, CREATE_WORDS);
  if (createCheck.match) {
    const afterCommand = text.slice(createCheck.keyword.length).trim();
    if (!afterCommand) {
      // พิมพ์แค่ "แจ้ง" → ให้เลือกระบบก่อน
      return { action: "SHOW_SYSTEMS" };
    }
    const { systemCode, cleanText } = extractSystemCode(afterCommand);
    if (!cleanText) {
      // มี system code แต่ไม่มีรายละเอียด → ให้เลือกระบบก่อน
      return { action: "SHOW_SYSTEMS" };
    }
    return { action: "CREATE_TICKET", text: cleanText, systemCode };
  }

  // ─── 2. ดูตั๋ว / ตั๋วของฉัน ───────────────────────────────
  const listCheck = startsWith(text, LIST_TICKET_WORDS);
  if (listCheck.match) {
    const afterCommand = text.slice(listCheck.keyword.length).trim();
    const { systemCode } = extractSystemCode(afterCommand);
    return { action: "LIST_TICKETS", systemCode };
  }

  // ─── 3. สถานะ ─────────────────────────────────────────────
  const statusCheck = startsWith(text, STATUS_WORDS);
  if (statusCheck.match) {
    const afterCommand = text.slice(statusCheck.keyword.length).trim();
    const prefixMatch = afterCommand.match(/^#?([A-Z]{2,6})-(\d+)$/i);
    if (prefixMatch) {
      return { action: "CHECK_STATUS", ticketNo: prefixMatch[2], systemPrefix: prefixMatch[1].toUpperCase() };
    }
    const numMatch = afterCommand.match(/^#?(\d+)/);
    if (numMatch) return { action: "CHECK_STATUS", ticketNo: numMatch[1] };
    return { action: "SHOW_MENU" };
  }

  // ─── 4. ถามเรื่องระบบ ─────────────────────────────────────
  if (includes(text, SYSTEMS_WORDS)) return { action: "SHOW_SYSTEMS" };

  // ─── 5. Greeting ──────────────────────────────────────────
  if (includes(text, GREETING_WORDS)) return { action: "GREETING" };

  // ─── 6. เมนู / Help ───────────────────────────────────────
  if (includes(text, MENU_WORDS)) return { action: "SHOW_MENU" };

  // ─── 7. PRO/ENTERPRISE: ส่งให้ Gemini AI ─────────────────
  if (plan !== "TRIAL" && plan !== "STARTER") {
    return { action: "GEMINI_QUERY", query: text };
  }

  // ─── 8. TRIAL: แสดงเมนู ───────────────────────────────────
  return { action: "SHOW_MENU" };
}
