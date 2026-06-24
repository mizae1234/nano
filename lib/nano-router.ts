// ─── น้องนาโน — Keyword Router ───────────────────────────────

import { Plan } from "@prisma/client";

const TRIGGERS = ["นาโน", "@นาโน", "nano", "@nano"];

export type NanoAction =
  | { action: "CREATE_TICKET"; text: string; systemCode?: string }
  | { action: "LIST_TICKETS"; systemCode?: string }
  | { action: "CHECK_STATUS"; ticketNo: string; systemPrefix?: string }
  | { action: "GEMINI_QUERY"; query: string }
  | { action: "SHOW_MENU" }
  | { action: "UPGRADE_REQUIRED" }
  | null;

/**
 * Parse system code จากข้อความ เช่น "[saran]" → "saran"
 * Returns { systemCode, cleanText } — cleanText คือข้อความที่เอา [code] ออกแล้ว
 */
function extractSystemCode(text: string): {
  systemCode?: string;
  cleanText: string;
} {
  const match = text.match(/\[([a-zA-Z0-9_-]+)\]/);
  if (match) {
    return {
      systemCode: match[1].toLowerCase(),
      cleanText: text.replace(match[0], "").trim(),
    };
  }
  return { cleanText: text };
}

/**
 * วิเคราะห์ข้อความจาก LINE แล้วแปลงเป็น NanoAction
 *
 * - ใน user chat: ไม่ต้องพิมพ์ trigger word
 * - ใน group/room: ต้องพิมพ์ trigger word ก่อน (นาโน, @นาโน, nano, @nano)
 *
 * รองรับ system code:
 * - "แจ้งปัญหา [saran] POS คิดเงินผิด" → CREATE_TICKET with systemCode
 * - "สถานะ SAR-1" → CHECK_STATUS with systemPrefix
 */
export function parseNanoCommand(
  message: string,
  sourceType: "user" | "group" | "room",
  plan: Plan
): NanoAction {
  let text = message.trim();

  // ในกลุ่ม/ห้อง ต้องมี trigger word
  if (sourceType !== "user") {
    const trigger = TRIGGERS.find((t) =>
      text.toLowerCase().startsWith(t.toLowerCase())
    );
    if (!trigger) return null;
    text = text.slice(trigger.length).trim();
  }

  // ถ้าไม่มีข้อความ → แสดงเมนู
  if (!text) return { action: "SHOW_MENU" };

  // แจ้งปัญหา [system_code] รายละเอียด
  if (/^แจ้งปัญหา/i.test(text)) {
    const afterCommand = text.replace(/^แจ้งปัญหา\s*/i, "");
    const { systemCode, cleanText } = extractSystemCode(afterCommand);
    return {
      action: "CREATE_TICKET",
      text: cleanText,
      systemCode,
    };
  }

  // ดูตั๋ว / ตั๋วของฉัน [system_code]
  if (/^ดูตั๋ว|^ตั๋วของฉัน/i.test(text)) {
    const afterCommand = text.replace(/^(ดูตั๋ว|ตั๋วของฉัน)\s*/i, "");
    const { systemCode } = extractSystemCode(afterCommand);
    return { action: "LIST_TICKETS", systemCode };
  }

  // สถานะ #123 หรือ สถานะ SAR-1
  if (/^สถานะ\s*/i.test(text)) {
    const afterCommand = text.replace(/^สถานะ\s*/i, "");

    // ลอง match format PREFIX-NUMBER เช่น SAR-1
    const prefixMatch = afterCommand.match(/^#?([A-Z]{2,5})-(\d+)$/i);
    if (prefixMatch) {
      return {
        action: "CHECK_STATUS",
        ticketNo: prefixMatch[2],
        systemPrefix: prefixMatch[1].toUpperCase(),
      };
    }

    // ลอง match format #123 (legacy)
    const numMatch = afterCommand.match(/^#?(\d+)/);
    if (numMatch) {
      return { action: "CHECK_STATUS", ticketNo: numMatch[1] };
    }

    return { action: "SHOW_MENU" };
  }

  // ถาม / ค้นหา (ต้องเป็น PRO หรือ ENTERPRISE)
  if (/^ถาม|^ค้นหา/i.test(text)) {
    if (plan === "TRIAL" || plan === "STARTER") {
      return { action: "UPGRADE_REQUIRED" };
    }
    return {
      action: "GEMINI_QUERY",
      query: text.replace(/^(ถาม|ค้นหา)\s*/i, ""),
    };
  }

  // ช่วย / help / menu
  if (/^ช่วย|^help|^menu/i.test(text)) {
    return { action: "SHOW_MENU" };
  }

  // ข้อความอื่นๆ
  if (plan === "TRIAL" || plan === "STARTER") {
    return { action: "SHOW_MENU" };
  }

  // PRO/ENTERPRISE — ส่งให้ Gemini ตอบ
  return { action: "GEMINI_QUERY", query: text };
}
