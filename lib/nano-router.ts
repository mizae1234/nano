// ─── Smart Command Router ─────────────────────────

import { Plan } from "@prisma/client";

// Trigger words for group chat
const TRIGGERS = ["นาโน", "@นาโน", "nano", "@nano"];

export type NanoAction =
  | { action: "CREATE_TICKET"; text: string; systemCode?: string }
  | { action: "ASSIGN_NOTE"; assigneeName: string; text: string; systemCode?: string }
  | { action: "LIST_TICKETS"; systemCode?: string }
  | { action: "CHECK_STATUS"; ticketNo: string; systemPrefix?: string }
  | { action: "FOLLOW_TICKET"; ticketNo: string; systemPrefix?: string }
  | { action: "CLOSE_TICKET"; ticketNo: string; systemPrefix?: string }
  | { action: "SHOW_SYSTEMS" }
  | { action: "GREETING" }
  | { action: "SHOW_MENU" }
  | { action: "GROUP_SUMMARY"; systemCode?: string }
  | { action: "GEMINI_QUERY"; query: string }
  | { action: "UPGRADE_REQUIRED" }
  | { action: "REGISTER"; employeeCode: string; name: string; departmentName: string }
  | null;

// ─── Keyword Banks ────────────────────────────────────────────
const GREETING_WORDS = ["สวัสดี", "หวัดดี", "ดีจ้า", "ดีครับ", "ดีค่ะ", "hi", "hello", "hey", "yo"];
const MENU_WORDS = ["เมนู", "menu", "help", "ช่วย", "ทำอะไรได้", "ใช้ยังไง", "วิธีใช้", "คำสั่ง"];
const SYSTEMS_WORDS = ["ระบบอะไรบ้าง", "มีระบบ", "ระบบที่รองรับ", "แจ้งระบบ", "แจ้งได้กี่ระบบ", "ระบบอะไร"];
const LIST_TICKET_WORDS = ["ดูตั๋ว", "ตั๋วของฉัน", "ticket ของฉัน", "ติดตามตั๋ว", "งานของฉัน", "ดูงาน", "list งาน", "list งานทั้งหมด", "งานทั้งหมด"];
const STATUS_WORDS = ["สถานะ", "status", "ตรวจสอบ"];
const CLOSE_WORDS = ["ปิด", "close", "ปิดตั๋ว", "ปิดงาน", "จบงาน"];
const CREATE_WORDS = ["แจ้ง", "แจ้งปัญหา", "report", "สร้าง ticket", "สร้างตั๋ว", "ขอแจ้ง"];
const NOTE_WORDS = ["note", "โน้ต", "บันทึก"];
const FOLLOW_WORDS = ["ติดตาม", "follow", "แจ้งเตือน"];
const SUMMARY_WORDS = ["สรุป", "summary", "สรุปงาน", "สถิติ", "stats"];

/**
 * Extract system code from message
 */
function extractSystemCode(text: string): { systemCode?: string; cleanText: string } {
  const bracketMatch = text.match(/\[([a-zA-Z0-9_-]+)\]/);
  if (bracketMatch) {
    return { systemCode: bracketMatch[1].toLowerCase(), cleanText: text.replace(bracketMatch[0], "").trim() };
  }
  const codeFirst = text.match(/^([A-Z]{2,8})\s+(.+)/i);
  if (codeFirst) {
    return { systemCode: codeFirst[1].toLowerCase(), cleanText: codeFirst[2].trim() };
  }
  return { cleanText: text };
}

function includes(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function startsWith(text: string, keywords: string[]): { match: boolean; keyword: string } {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (lower.startsWith(kw.toLowerCase())) return { match: true, keyword: kw };
  }
  return { match: false, keyword: "" };
}

/**
 * Parse LINE message into NanoAction
 */
export function parseNanoCommand(
  message: string,
  sourceType: "user" | "group" | "room",
  plan: Plan
): NanoAction {
  let text = message.trim();

  // Group/Room: require trigger word OR exact bot command keywords
  if (sourceType !== "user") {
    const trigger = TRIGGERS.find((t) => text.toLowerCase().startsWith(t.toLowerCase()));
    if (trigger) {
      text = text.slice(trigger.length).trim();
    } else {
      // Check if the text matches any bot commands directly
      const isCommand =
        includes(text, GREETING_WORDS) ||
        includes(text, MENU_WORDS) ||
        includes(text, SYSTEMS_WORDS) ||
        includes(text, LIST_TICKET_WORDS) ||
        startsWith(text, STATUS_WORDS).match ||
        startsWith(text, CLOSE_WORDS).match ||
        startsWith(text, CREATE_WORDS).match ||
        includes(text, SUMMARY_WORDS);

      if (!isCommand) return null;
    }
  }

  if (!text) return { action: "SHOW_MENU" };

  // ─── 0.1. ลงทะเบียน ───────────────────────────────────────
  if (text.startsWith("ลงทะเบียน") || text.includes("ลงทะเบียน")) {
    const codeMatch = text.match(/รหัสพนักงาน\s*(\S+)/);
    const nameMatch = text.match(/ชื่อ\s*([^\sแผนก]+)/) || text.match(/ชื่อ\s*(\S+)/);
    const deptMatch = text.match(/แผนก\s*(\S+)/);
    return {
      action: "REGISTER",
      employeeCode: codeMatch ? codeMatch[1].trim() : "",
      name: nameMatch ? nameMatch[1].trim() : "",
      departmentName: deptMatch ? deptMatch[1].trim() : "",
    };
  }

  // ─── 0. Note / Assign Task ────────────────────────────────
  const noteCheck = startsWith(text, NOTE_WORDS);
  if (noteCheck.match) {
    const afterCommand = text.slice(noteCheck.keyword.length).trim();
    const mentionMatch = afterCommand.match(/@([^\s]+)/);
    if (mentionMatch) {
      const assigneeName = mentionMatch[1];
      const remainingText = afterCommand.replace(mentionMatch[0], "").trim();
      const { systemCode, cleanText } = extractSystemCode(remainingText);
      return { action: "ASSIGN_NOTE", assigneeName, text: cleanText, systemCode };
    }
    return { action: "SHOW_MENU" };
  }

  // ─── 1. แจ้ง / แจ้งปัญหา ──────────────────────────────────
  const createCheck = startsWith(text, CREATE_WORDS);
  if (createCheck.match) {
    const afterCommand = text.slice(createCheck.keyword.length).trim();
    if (!afterCommand) return { action: "SHOW_SYSTEMS" };
    const { systemCode, cleanText } = extractSystemCode(afterCommand);
    if (!cleanText) {
      if (systemCode) {
        return { action: "CREATE_TICKET", text: "", systemCode };
      }
      return { action: "SHOW_SYSTEMS" };
    }
    return { action: "CREATE_TICKET", text: cleanText, systemCode };
  }

  // ─── 2. ติดตาม ────────────────────────────────────────────
  const followCheck = startsWith(text, FOLLOW_WORDS);
  if (followCheck.match) {
    const afterCommand = text.slice(followCheck.keyword.length).trim();
    const prefixMatch = afterCommand.match(/^#?([A-Z]{2,6})-(\d+)$/i);
    if (prefixMatch) {
      return { action: "FOLLOW_TICKET", ticketNo: prefixMatch[2], systemPrefix: prefixMatch[1].toUpperCase() };
    }
    const numMatch = afterCommand.match(/^#?(\d+)/);
    if (numMatch) return { action: "FOLLOW_TICKET", ticketNo: numMatch[1] };
    return { action: "SHOW_MENU" };
  }

  // ─── 3. ดูตั๋ว / ตั๋วของฉัน ───────────────────────────────
  const listCheck = startsWith(text, LIST_TICKET_WORDS);
  if (listCheck.match) {
    const afterCommand = text.slice(listCheck.keyword.length).trim();
    const { systemCode } = extractSystemCode(afterCommand);
    return { action: "LIST_TICKETS", systemCode };
  }

  // ─── 4. สถานะ ─────────────────────────────────────────────
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

  // ─── 4.5 ปิดตั๋ว ──────────────────────────────────────────
  const closeCheck = startsWith(text, CLOSE_WORDS);
  if (closeCheck.match) {
    const afterCommand = text.slice(closeCheck.keyword.length).trim();
    const prefixMatch = afterCommand.match(/^#?([A-Z]{2,6})-(\d+)$/i);
    if (prefixMatch) {
      return { action: "CLOSE_TICKET", ticketNo: prefixMatch[2], systemPrefix: prefixMatch[1].toUpperCase() };
    }
    const numMatch = afterCommand.match(/^#?(\d+)/);
    if (numMatch) return { action: "CLOSE_TICKET", ticketNo: numMatch[1] };
    return { action: "SHOW_MENU" };
  }

  // ─── 5. สรุปงาน ───────────────────────────────────────────
  if (includes(text, SUMMARY_WORDS)) {
    const { systemCode } = extractSystemCode(text);
    return { action: "GROUP_SUMMARY", systemCode };
  }

  // ─── 6. ระบบ ──────────────────────────────────────────────
  if (includes(text, SYSTEMS_WORDS)) return { action: "SHOW_SYSTEMS" };

  // ─── 7. Greeting ──────────────────────────────────────────
  if (includes(text, GREETING_WORDS)) return { action: "GREETING" };

  // ─── 8. เมนู / Help ───────────────────────────────────────
  if (includes(text, MENU_WORDS)) return { action: "SHOW_MENU" };

  // ─── ทุก plan: ส่งให้ Gemini AI จัดการ ──────────────────────
  return { action: "GEMINI_QUERY", query: text };
}
