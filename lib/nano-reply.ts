// ─── Flex Message Builders ────────────────────────

import { Plan } from "@prisma/client";
import { STATUS_LABEL, PRIORITY_LABEL, PLAN_LABEL, TICKET_TYPE_LABEL, TICKET_TYPE_ICON } from "./labels";

// ─── Bot Config Defaults ──────────────────────────────────────
export interface BotMeta {
  botName?: string;
  botPersona?: string;
  themeColor?: string;
}

const DEFAULT: Required<BotMeta> = {
  botName: "🤖 น้องนาโน",
  botPersona: "ค่ะ",
  themeColor: "#0066FF",
};

function meta(bot?: BotMeta): Required<BotMeta> {
  return {
    botName: bot?.botName ? `🤖 ${bot.botName}` : DEFAULT.botName,
    botPersona: bot?.botPersona ?? DEFAULT.botPersona,
    themeColor: bot?.themeColor ?? DEFAULT.themeColor,
  };
}

interface TicketInfo {
  ticketNo: number;
  title: string;
  status: string;
  priority: string;
  ticketType?: string;
  departmentName?: string;
  assignedToName?: string;
  createdByName?: string;
  systemName?: string;
  systemIcon?: string;
  systemPrefix?: string;
  createdAt: string;
}

interface SystemInfo {
  id: string;
  code: string;
  name: string;
  icon?: string | null;
  color: string;
}

// ─── Priority helpers ─────────────────────────────────────────
const PRIORITY_COLOR: Record<string, string> = {
  URGENT: "#ef4444", HIGH: "#f97316", MEDIUM: "#3b82f6", LOW: "#6b7280",
};

const PRIORITY_EMOJI: Record<string, string> = {
  URGENT: "🔴", HIGH: "🟠", MEDIUM: "🔵", LOW: "⚪",
};

// ─── Shared helpers ───────────────────────────────────────────
function headerBox(title: string, themeColor: string, botName: string) {
  return {
    type: "box", layout: "vertical",
    contents: [
      { type: "text", text: botName, color: "#ffffff", size: "xxs", weight: "bold" },
      { type: "text", text: title, color: "#ffffff", size: "md", weight: "bold", margin: "xs" },
    ],
    backgroundColor: themeColor, paddingAll: "12px",
  };
}

function infoRow(label: string, value: string) {
  return {
    type: "box", layout: "horizontal",
    contents: [
      { type: "text", text: label, size: "xs", color: "#aaaaaa", flex: 3 },
      { type: "text", text: value, size: "xs", color: "#333333", flex: 5, wrap: true },
    ],
  };
}

// ══════════════════════════════════════════════════════════════
//  MENU (DM)
// ══════════════════════════════════════════════════════════════

export function menuFlex(plan: Plan, bot?: BotMeta, menuMessage?: string) {
  const { botName, botPersona, themeColor } = meta(bot);
  const actions: object[] = [
    { type: "button", action: { type: "message", label: "📝 แจ้งปัญหา", text: "แจ้ง " }, style: "primary", color: themeColor, height: "sm" },
    { type: "button", action: { type: "message", label: "📋 ดูตั๋วของฉัน", text: "ดูตั๋ว" }, style: "secondary", height: "sm" },
    { type: "button", action: { type: "message", label: "🔍 ตรวจสอบสถานะ", text: "สถานะ #" }, style: "secondary", height: "sm" },
  ];
  if (plan === "PRO" || plan === "ENTERPRISE") {
    actions.push({ type: "button", action: { type: "message", label: `🤖 ถาม${botName.replace("🤖 ", "")}`, text: "ถาม " }, style: "secondary", height: "sm" });
  }
  return {
    type: "flex", altText: "เมนูหลัก",
    contents: {
      type: "bubble", size: "kilo",
      header: headerBox("เมนูหลัก", themeColor, botName),
      body: {
        type: "box", layout: "vertical", paddingAll: "12px",
        contents: [
          { type: "text", text: menuMessage || `เลือกสิ่งที่ต้องการ${botPersona} 😊`, size: "sm", color: "#555555", margin: "sm" },
          { type: "text", text: "💡 พิมพ์ \"แจ้ง [ระบบ] ปัญหา\" เพื่อสร้าง ticket", size: "xxs", color: "#aaaaaa", margin: "xs", wrap: true },
        ],
      },
      footer: { type: "box", layout: "vertical", contents: actions, spacing: "sm", paddingAll: "12px" },
    },
  };
}

// ══════════════════════════════════════════════════════════════
//  GROUP MENU
// ══════════════════════════════════════════════════════════════

export function groupMenuFlex(plan: Plan, systemName?: string, bot?: BotMeta) {
  const { botName, botPersona, themeColor } = meta(bot);
  const label = systemName ? ` (${systemName})` : "";
  const actions: object[] = [
    { type: "button", action: { type: "message", label: `📝 แจ้งปัญหา${label}`, text: "นาโน แจ้ง " }, style: "primary", color: themeColor, height: "sm" },
    { type: "button", action: { type: "message", label: "📋 ดูตั๋วทั้งหมด", text: "นาโน ดูตั๋ว" }, style: "secondary", height: "sm" },
    { type: "button", action: { type: "message", label: "📊 สรุปงาน", text: "นาโน สรุป" }, style: "secondary", height: "sm" },
    { type: "button", action: { type: "message", label: "🔍 ตรวจสอบสถานะ", text: "นาโน สถานะ #" }, style: "secondary", height: "sm" },
  ];
  return {
    type: "flex", altText: "เมนู Group",
    contents: {
      type: "bubble", size: "kilo",
      header: headerBox(`เมนู Group${label}`, themeColor, botName),
      body: {
        type: "box", layout: "vertical", paddingAll: "12px",
        contents: [
          { type: "text", text: `พิมพ์ "นาโน" ตามด้วยคำสั่ง${botPersona}`, size: "sm", color: "#555555", wrap: true },
        ],
      },
      footer: { type: "box", layout: "vertical", contents: actions, spacing: "sm", paddingAll: "12px" },
    },
  };
}

// ══════════════════════════════════════════════════════════════
//  SYSTEM SELECT
// ══════════════════════════════════════════════════════════════

export function systemSelectFlex(systems: SystemInfo[], actionPrefix: string, bot?: BotMeta) {
  const { botName, botPersona, themeColor } = meta(bot);
  const buttons = systems.slice(0, 10).map((sys) => ({
    type: "button",
    action: { type: "message", label: `${sys.icon || "⚙️"} ${sys.name}`, text: `${actionPrefix} [${sys.code}]` },
    style: "secondary", height: "sm",
  }));
  return {
    type: "flex", altText: `เลือกระบบ${botPersona}`,
    contents: {
      type: "bubble", size: "kilo",
      header: headerBox("⚙️ เลือกระบบ", themeColor, botName),
      body: {
        type: "box", layout: "vertical", paddingAll: "12px",
        contents: [{ type: "text", text: `กรุณาเลือกระบบที่ต้องการ${botPersona}`, size: "sm", color: "#555555", wrap: true }],
      },
      footer: { type: "box", layout: "vertical", contents: buttons, spacing: "sm", paddingAll: "12px" },
    },
  };
}

// ══════════════════════════════════════════════════════════════
//  TICKET CREATED ✅
// ══════════════════════════════════════════════════════════════

export function ticketCreatedFlex(ticket: TicketInfo, detailUrl: string, bot?: BotMeta) {
  const { botName, themeColor } = meta(bot);
  const ticketRef = ticket.systemPrefix ? `#${ticket.systemPrefix}-${ticket.ticketNo}` : `#${ticket.ticketNo}`;
  return {
    type: "flex", altText: `✅ Ticket ${ticketRef} สำเร็จ`,
    contents: {
      type: "bubble", size: "kilo",
      header: {
        type: "box", layout: "horizontal", paddingAll: "10px",
        backgroundColor: themeColor, alignItems: "center",
        contents: [
          { type: "text", text: botName, size: "xxs", color: "#ffffff", flex: 3 },
          { type: "text", text: "✅ สร้าง Ticket แล้ว", size: "xxs", color: "#ffffffcc", align: "end", flex: 4 },
        ],
      },
      body: {
        type: "box", layout: "vertical", paddingAll: "12px", spacing: "sm",
        contents: [
          {
            type: "box", layout: "horizontal", alignItems: "center",
            contents: [
              { type: "text", text: ticketRef, weight: "bold", size: "lg", color: themeColor, flex: 0 },
              ...(ticket.systemName ? [{ type: "text" as const, text: `${ticket.systemIcon || "⚙️"} ${ticket.systemName}`, size: "xxs" as const, color: "#888888", align: "end" as const, flex: 1 }] : []),
            ],
          },
          { type: "text", text: ticket.title, size: "sm", wrap: true, color: "#333333" },
          { type: "separator", margin: "sm" },
          {
            type: "box", layout: "vertical", spacing: "xs",
            contents: [
              infoRow("สถานะ", STATUS_LABEL[ticket.status as keyof typeof STATUS_LABEL] || ticket.status),
              ...(ticket.ticketType ? [infoRow("ประเภท", `${TICKET_TYPE_ICON[ticket.ticketType as keyof typeof TICKET_TYPE_ICON] || ""} ${TICKET_TYPE_LABEL[ticket.ticketType as keyof typeof TICKET_TYPE_LABEL] || ticket.ticketType}`)] : []),
              infoRow("Priority", `${PRIORITY_EMOJI[ticket.priority] || ""} ${PRIORITY_LABEL[ticket.priority as keyof typeof PRIORITY_LABEL] || ticket.priority}`),
            ],
          },
        ],
      },
      footer: {
        type: "box", layout: "vertical", paddingAll: "10px",
        contents: [{ type: "button", action: { type: "uri", label: "ดูรายละเอียด", uri: detailUrl }, style: "primary", color: themeColor, height: "sm" }],
      },
    },
  };
}

// ══════════════════════════════════════════════════════════════
//  TICKET CREATED WITH AI ✨
// ══════════════════════════════════════════════════════════════

export function ticketCreatedWithAIFlex(
  ticket: TicketInfo, detailUrl: string,
  aiAnalysis: { emoji: string; suggestedCategory?: string }, bot?: BotMeta
) {
  const { botName, themeColor } = meta(bot);
  const ticketRef = ticket.systemPrefix ? `#${ticket.systemPrefix}-${ticket.ticketNo}` : `#${ticket.ticketNo}`;
  const priorityColor = PRIORITY_COLOR[ticket.priority] || themeColor;
  return {
    type: "flex", altText: `${aiAnalysis.emoji} AI สร้าง Ticket ${ticketRef} สำเร็จ`,
    contents: {
      type: "bubble", size: "kilo",
      header: headerBox(`${aiAnalysis.emoji} AI วิเคราะห์ & สร้าง Ticket แล้ว`, themeColor, botName),
      body: {
        type: "box", layout: "vertical", paddingAll: "12px",
        contents: [
          {
            type: "box", layout: "horizontal", alignItems: "center",
            contents: [
              { type: "text", text: ticketRef, weight: "bold", size: "lg", color: themeColor, flex: 3 },
              {
                type: "box", layout: "vertical", flex: 2,
                contents: [{ type: "text", text: `${PRIORITY_EMOJI[ticket.priority]} ${PRIORITY_LABEL[ticket.priority as keyof typeof PRIORITY_LABEL] || ticket.priority}`, size: "xs", color: "#ffffff", align: "center" }],
                backgroundColor: priorityColor, paddingAll: "4px", cornerRadius: "8px",
              },
            ],
          },
          { type: "text", text: ticket.title, size: "sm", wrap: true, margin: "sm", weight: "bold" },
          { type: "separator", margin: "sm" },
          {
            type: "box", layout: "vertical", margin: "sm", spacing: "xs",
            contents: [
              ...(ticket.systemName ? [infoRow("ระบบ", `${ticket.systemIcon || "⚙️"} ${ticket.systemName}`)] : []),
              ...(ticket.ticketType ? [infoRow("ประเภท", `${TICKET_TYPE_ICON[ticket.ticketType as keyof typeof TICKET_TYPE_ICON] || ""} ${TICKET_TYPE_LABEL[ticket.ticketType as keyof typeof TICKET_TYPE_LABEL] || ticket.ticketType}`)] : []),
              ...(aiAnalysis.suggestedCategory ? [infoRow("หมวดหมู่", `🏷️ ${aiAnalysis.suggestedCategory}`)] : []),
              ...(ticket.assignedToName ? [infoRow("ผู้รับผิดชอบ", `👤 ${ticket.assignedToName}`)] : []),
              ...(ticket.departmentName ? [infoRow("แผนก", ticket.departmentName)] : []),
            ],
          },
          { type: "text", text: "🤖 AI วิเคราะห์ priority & หมวดหมู่อัตโนมัติ", size: "xxs", color: "#aaaaaa", margin: "sm", wrap: true },
        ],
      },
      footer: {
        type: "box", layout: "vertical", spacing: "sm", paddingAll: "10px",
        contents: [
          { type: "button", action: { type: "uri", label: "ดูรายละเอียด Ticket", uri: detailUrl }, style: "primary", color: themeColor, height: "sm" },
          { type: "button", action: { type: "message", label: "📋 ดู Ticket ทั้งหมด", text: "ดูตั๋ว" }, style: "secondary", height: "sm" },
        ],
      },
    },
  };
}

// ══════════════════════════════════════════════════════════════
//  TICKET LIST (Carousel)
// ══════════════════════════════════════════════════════════════

export function ticketListFlex(tickets: TicketInfo[], baseUrl: string, bot?: BotMeta) {
  const { botName, botPersona, themeColor } = meta(bot);
  if (tickets.length === 0) {
    return {
      type: "flex", altText: "ไม่พบ Ticket",
      contents: {
        type: "bubble", size: "kilo",
        header: headerBox("📋 ตั๋วของฉัน", themeColor, botName),
        body: {
          type: "box", layout: "vertical", paddingAll: "12px",
          contents: [
            { type: "text", text: `ยังไม่มี Ticket${botPersona} 😊`, size: "sm", wrap: true, color: "#555555" },
            { type: "text", text: "พิมพ์ \"แจ้ง ปัญหา...\" เพื่อสร้าง Ticket ใหม่", size: "xxs", color: "#aaaaaa", margin: "sm", wrap: true },
          ],
        },
      },
    };
  }
  const bubbles = tickets.slice(0, 10).map((ticket) => {
    const ticketRef = ticket.systemPrefix ? `${ticket.systemPrefix}-${ticket.ticketNo}` : `#${ticket.ticketNo}`;
    return {
      type: "bubble", size: "kilo",
      header: {
        type: "box", layout: "horizontal",
        contents: [
          { type: "text", text: ticketRef, color: "#ffffff", size: "sm", weight: "bold", flex: 1 },
          { type: "text", text: PRIORITY_EMOJI[ticket.priority] || "⚪", size: "sm", align: "end" as const, flex: 0 },
        ],
        backgroundColor: themeColor, paddingAll: "10px",
      },
      body: {
        type: "box", layout: "vertical", paddingAll: "10px", spacing: "sm",
        contents: [
          ...(ticket.systemName ? [{ type: "text" as const, text: `${ticket.systemIcon || "⚙️"} ${ticket.systemName}`, size: "xxs" as const, color: "#888888" as const }] : []),
          { type: "text", text: ticket.title, weight: "bold" as const, size: "sm" as const, wrap: true, maxLines: 2 },
          {
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              { type: "text", text: STATUS_LABEL[ticket.status as keyof typeof STATUS_LABEL] || ticket.status, size: "xxs", color: "#888888", flex: 1 },
              { type: "text", text: ticket.createdAt, size: "xxs", color: "#cccccc", align: "end" as const, flex: 1 },
            ],
          },
          ...(ticket.createdByName ? [{
            type: "text" as const, text: `👤 ${ticket.createdByName}`, size: "xxs" as const, color: "#aaaaaa" as const,
          }] : []),
        ],
      },
      footer: {
        type: "box", layout: "vertical", paddingAll: "8px",
        contents: [{ type: "button", action: { type: "message", label: "สถานะ", text: `สถานะ ${ticketRef}` }, style: "secondary", height: "sm" }],
      },
    };
  });
  return {
    type: "flex", altText: `ตั๋ว (${tickets.length} รายการ)`,
    contents: { type: "carousel", contents: bubbles },
  };
}

// ══════════════════════════════════════════════════════════════
//  TICKET STATUS
// ══════════════════════════════════════════════════════════════

export function ticketStatusFlex(ticket: TicketInfo, bot?: BotMeta) {
  const { botName, themeColor } = meta(bot);
  const ticketRef = ticket.systemPrefix ? `${ticket.systemPrefix}-${ticket.ticketNo}` : `#${ticket.ticketNo}`;
  return {
    type: "flex", altText: `สถานะ Ticket ${ticketRef}`,
    contents: {
      type: "bubble", size: "kilo",
      header: headerBox(`📊 สถานะ ${ticketRef}`, themeColor, botName),
      body: {
        type: "box", layout: "vertical", paddingAll: "12px",
        contents: [
          { type: "text", text: ticket.title, weight: "bold", size: "sm", wrap: true },
          { type: "separator", margin: "sm" },
          {
            type: "box", layout: "vertical", margin: "sm", spacing: "sm",
            contents: [
              ...(ticket.systemName ? [infoRow("ระบบ", `${ticket.systemIcon || "⚙️"} ${ticket.systemName}`)] : []),
              ...(ticket.ticketType ? [infoRow("ประเภท", `${TICKET_TYPE_ICON[ticket.ticketType as keyof typeof TICKET_TYPE_ICON] || ""} ${TICKET_TYPE_LABEL[ticket.ticketType as keyof typeof TICKET_TYPE_LABEL] || ticket.ticketType}`)] : []),
              infoRow("สถานะ", STATUS_LABEL[ticket.status as keyof typeof STATUS_LABEL] || ticket.status),
              infoRow("Priority", `${PRIORITY_EMOJI[ticket.priority] || ""} ${PRIORITY_LABEL[ticket.priority as keyof typeof PRIORITY_LABEL] || ticket.priority}`),
              ...(ticket.createdByName ? [infoRow("ผู้แจ้ง", `👤 ${ticket.createdByName}`)] : []),
              ...(ticket.departmentName ? [infoRow("แผนก", ticket.departmentName)] : []),
              ...(ticket.assignedToName ? [infoRow("ผู้รับผิดชอบ", `👤 ${ticket.assignedToName}`)] : []),
              infoRow("วันที่สร้าง", ticket.createdAt),
            ],
          },
        ],
      },
    },
  };
}

// ══════════════════════════════════════════════════════════════
//  FOLLOW TICKET
// ══════════════════════════════════════════════════════════════

export function followTicketFlex(ticketRef: string, isFollowing: boolean, bot?: BotMeta) {
  const { botName, botPersona, themeColor } = meta(bot);
  const title = isFollowing ? `✅ ติดตาม ${ticketRef} แล้ว` : `❌ ยกเลิกติดตาม ${ticketRef}`;
  const msg = isFollowing
    ? `จะแจ้งเมื่อ ${ticketRef} มีอัปเดต${botPersona}`
    : `หยุดแจ้งเตือน ${ticketRef} แล้ว${botPersona}`;
  return {
    type: "flex", altText: title,
    contents: {
      type: "bubble", size: "kilo",
      header: headerBox(title, themeColor, botName),
      body: {
        type: "box", layout: "vertical", paddingAll: "12px",
        contents: [{ type: "text", text: msg, size: "sm", wrap: true, color: "#555555" }],
      },
    },
  };
}

// ══════════════════════════════════════════════════════════════
//  GROUP SUMMARY
// ══════════════════════════════════════════════════════════════

export function groupSummaryFlex(stats: { open: number; inProgress: number; pending: number; resolved: number; closed: number; total: number }, systemName?: string, bot?: BotMeta) {
  const { botName, themeColor } = meta(bot);
  const label = systemName || "ทั้งหมด";
  return {
    type: "flex", altText: `📊 สรุปงาน ${label}`,
    contents: {
      type: "bubble", size: "kilo",
      header: headerBox(`📊 สรุปงาน ${label}`, themeColor, botName),
      body: {
        type: "box", layout: "vertical", paddingAll: "12px", spacing: "sm",
        contents: [
          infoRow("เปิดอยู่", `${stats.open} ใบ`),
          infoRow("กำลังดำเนินการ", `${stats.inProgress} ใบ`),
          infoRow("รอข้อมูล", `${stats.pending} ใบ`),
          infoRow("แก้ไขแล้ว", `${stats.resolved} ใบ`),
          infoRow("ปิดแล้ว", `${stats.closed} ใบ`),
          { type: "separator", margin: "sm" },
          infoRow("รวมทั้งหมด", `${stats.total} ใบ`),
        ],
      },
    },
  };
}

// ══════════════════════════════════════════════════════════════
//  WELCOME
// ══════════════════════════════════════════════════════════════

export function welcomeFlex(displayName: string, orgName: string, bot?: BotMeta, welcomeMessage?: string) {
  const { botName, botPersona, themeColor } = meta(bot);
  return {
    type: "flex", altText: `ยินดีต้อนรับสู่ ${orgName}`,
    contents: {
      type: "bubble", size: "kilo",
      header: headerBox("🎉 ยินดีต้อนรับ", themeColor, botName),
      body: {
        type: "box", layout: "vertical", paddingAll: "12px",
        contents: [
          { type: "text", text: `สวัสดี${botPersona} คุณ${displayName}! 👋`, weight: "bold", size: "md", wrap: true },
          { type: "text", text: welcomeMessage || `ยินดีต้อนรับสู่ระบบ ${orgName} ${botPersona}`, size: "sm", color: "#555555", margin: "sm", wrap: true },
          { type: "text", text: "พิมพ์ \"ช่วย\" เพื่อดูเมนูการใช้งาน", size: "sm", color: "#888888", margin: "sm", wrap: true },
        ],
      },
      footer: {
        type: "box", layout: "vertical", paddingAll: "10px",
        contents: [{ type: "button", action: { type: "message", label: "📋 ดูเมนู", text: "ช่วย" }, style: "primary", color: themeColor, height: "sm" }],
      },
    },
  };
}

// ══════════════════════════════════════════════════════════════
//  UPGRADE REQUIRED
// ══════════════════════════════════════════════════════════════

export function upgradeRequiredFlex(currentPlan: Plan, bot?: BotMeta) {
  const { botName, botPersona } = meta(bot);
  return {
    type: "flex", altText: "กรุณาอัปเกรดแผน",
    contents: {
      type: "bubble", size: "kilo",
      header: headerBox("⬆️ อัปเกรดแผน", "#f59e0b", botName),
      body: {
        type: "box", layout: "vertical", paddingAll: "12px",
        contents: [
          { type: "text", text: `แผนปัจจุบัน: ${PLAN_LABEL[currentPlan]}`, size: "sm", color: "#555555" },
          { type: "text", text: `ฟีเจอร์ AI ใช้ได้เฉพาะแผน Pro ขึ้นไป${botPersona}`, size: "sm", color: "#555555", wrap: true, margin: "sm" },
          { type: "separator", margin: "sm" },
          { type: "text", text: "• Pro ฿2,990/เดือน — AI + ไม่จำกัดผู้ใช้", size: "xs", color: "#555555", margin: "sm" },
          { type: "text", text: "• Enterprise — Dedicated DB + SLA", size: "xs", color: "#555555", margin: "xs" },
        ],
      },
    },
  };
}

// ══════════════════════════════════════════════════════════════
//  GEMINI ANSWER ✨
// ══════════════════════════════════════════════════════════════

export function geminiAnswerFlex(question: string, answer: string, bot?: BotMeta) {
  const { botName, botPersona, themeColor } = meta(bot);
  const shortAnswer = answer.length > 1000 ? answer.substring(0, 997) + "..." : answer;
  const displayName = botName.replace("🤖 ", "");
  return {
    type: "flex", altText: `🤖 ${answer.substring(0, 60)}`,
    contents: {
      type: "bubble", size: "kilo",
      header: headerBox(`🤖 ${displayName}ตอบ${botPersona}`, themeColor, botName),
      body: {
        type: "box", layout: "vertical", paddingAll: "12px",
        contents: [
          {
            type: "box", layout: "vertical", backgroundColor: "#f9fafb", paddingAll: "8px", cornerRadius: "8px",
            contents: [
              { type: "text", text: "คำถาม", size: "xxs", color: "#aaaaaa", weight: "bold" },
              { type: "text", text: question.substring(0, 80), size: "xs", color: "#666666", wrap: true, margin: "xs" },
            ],
          },
          { type: "separator", margin: "sm" },
          { type: "text", text: shortAnswer, size: "sm", wrap: true, margin: "sm", color: "#333333" },
        ],
      },
      footer: {
        type: "box", layout: "vertical", paddingAll: "10px", spacing: "sm",
        contents: [
          { type: "button", action: { type: "message", label: "📋 กลับเมนูหลัก", text: "ช่วย" }, style: "secondary", height: "sm" },
          { type: "button", action: { type: "message", label: "🤖 ถามอีกครั้ง", text: "ถาม " }, style: "primary", color: themeColor, height: "sm" },
        ],
      },
    },
  };
}

// ══════════════════════════════════════════════════════════════
//  URGENT ALERT 🚨
// ══════════════════════════════════════════════════════════════

export function urgentAlertFlex(ticket: TicketInfo, reporterName: string, detailUrl: string, bot?: BotMeta) {
  const { botName } = meta(bot);
  const ticketRef = ticket.systemPrefix ? `${ticket.systemPrefix}-${ticket.ticketNo}` : `#${ticket.ticketNo}`;
  return {
    type: "flex", altText: `🚨 URGENT! ${ticketRef}: ${ticket.title}`,
    contents: {
      type: "bubble", size: "kilo",
      header: headerBox("🚨 แจ้งเตือน URGENT!", "#ef4444", botName),
      body: {
        type: "box", layout: "vertical", paddingAll: "12px",
        contents: [
          {
            type: "box", layout: "horizontal", backgroundColor: "#fef2f2", paddingAll: "8px", cornerRadius: "8px",
            contents: [
              { type: "text", text: ticketRef, weight: "bold", size: "lg", color: "#ef4444", flex: 1 },
              { type: "text", text: "🔴 URGENT", size: "xs", color: "#ef4444", align: "end" as const, flex: 0 },
            ],
          },
          { type: "text", text: ticket.title, weight: "bold", size: "sm", wrap: true, margin: "sm" },
          { type: "separator", margin: "sm" },
          {
            type: "box", layout: "vertical", margin: "sm", spacing: "sm",
            contents: [
              infoRow("ผู้แจ้ง", `👤 ${reporterName}`),
              ...(ticket.systemName ? [infoRow("ระบบ", `${ticket.systemIcon || "⚙️"} ${ticket.systemName}`)] : []),
              ...(ticket.departmentName ? [infoRow("แผนก", ticket.departmentName)] : []),
              infoRow("เวลาแจ้ง", ticket.createdAt),
            ],
          },
        ],
      },
      footer: {
        type: "box", layout: "vertical", spacing: "sm", paddingAll: "10px",
        contents: [
          { type: "button", action: { type: "uri", label: "🔍 ดูรายละเอียดทันที", uri: detailUrl }, style: "primary", color: "#ef4444", height: "sm" },
          { type: "button", action: { type: "message", label: "✅ รับงานแล้ว", text: `รับงาน ${ticketRef}` }, style: "secondary", height: "sm" },
        ],
      },
    },
  };
}

// ══════════════════════════════════════════════════════════════
//  QUICK ACTION
// ══════════════════════════════════════════════════════════════

export function quickActionFlex(ticket: TicketInfo, detailUrl: string, bot?: BotMeta) {
  const { botName, themeColor } = meta(bot);
  const ticketRef = ticket.systemPrefix ? `${ticket.systemPrefix}-${ticket.ticketNo}` : `#${ticket.ticketNo}`;
  const statusColor: Record<string, string> = {
    OPEN: "#3b82f6", IN_PROGRESS: "#f59e0b", PENDING: "#8b5cf6", RESOLVED: "#10b981", CLOSED: "#6b7280",
  };
  return {
    type: "flex", altText: `⚡ Quick Action — ${ticketRef}`,
    contents: {
      type: "bubble", size: "kilo",
      header: headerBox(`⚡ Quick Action — ${ticketRef}`, themeColor, botName),
      body: {
        type: "box", layout: "vertical", paddingAll: "12px",
        contents: [
          { type: "text", text: ticket.title, weight: "bold", size: "sm", wrap: true, maxLines: 2 },
          {
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              {
                type: "box", layout: "vertical",
                contents: [{ type: "text", text: STATUS_LABEL[ticket.status as keyof typeof STATUS_LABEL] || ticket.status, size: "xxs", color: "#ffffff", align: "center" as const }],
                backgroundColor: statusColor[ticket.status] || "#6b7280", paddingAll: "4px", cornerRadius: "8px",
              },
              { type: "filler" },
              { type: "text", text: `${PRIORITY_EMOJI[ticket.priority] || ""} ${PRIORITY_LABEL[ticket.priority as keyof typeof PRIORITY_LABEL] || ticket.priority}`, size: "xs", color: "#666666", align: "end" as const },
            ],
          },
        ],
      },
      footer: {
        type: "box", layout: "vertical", spacing: "sm", paddingAll: "10px",
        contents: [
          { type: "button", action: { type: "uri", label: "📝 แก้ไข / อัปเดต", uri: detailUrl }, style: "primary", color: themeColor, height: "sm" },
          {
            type: "box", layout: "horizontal", spacing: "sm",
            contents: [
              { type: "button", action: { type: "message", label: "✅ ปิด Ticket", text: `ปิด ${ticketRef}` }, style: "secondary", height: "sm", flex: 1 },
              { type: "button", action: { type: "message", label: "📋 ดูทั้งหมด", text: "ดูตั๋ว" }, style: "secondary", height: "sm", flex: 1 },
            ],
          },
        ],
      },
    },
  };
}
