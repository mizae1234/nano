// ─── น้องนาโน — Flex Message Builders ────────────────────────

import { Plan } from "@prisma/client";
import { STATUS_LABEL, PRIORITY_LABEL, PLAN_LABEL, TICKET_TYPE_LABEL, TICKET_TYPE_ICON } from "./labels";

const BOT_NAME = "🤖 น้องนาโน";

interface TicketInfo {
  ticketNo: number;
  title: string;
  status: string;
  priority: string;
  ticketType?: string;
  departmentName?: string;
  assignedToName?: string;
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

/**
 * สร้าง Flex Message สำหรับ header ที่ใช้สีของ tenant
 */
function headerBox(title: string, themeColor: string) {
  return {
    type: "box",
    layout: "vertical",
    contents: [
      {
        type: "text",
        text: BOT_NAME,
        color: "#ffffff",
        size: "sm",
        weight: "bold",
      },
      {
        type: "text",
        text: title,
        color: "#ffffff",
        size: "lg",
        weight: "bold",
        margin: "sm",
      },
    ],
    backgroundColor: themeColor,
    paddingAll: "16px",
  };
}

/**
 * เมนูหลัก — ซ่อน "ถามนาโน" ถ้า TRIAL/STARTER
 */
export function menuFlex(plan: Plan, themeColor: string = "#0066FF") {
  const actions = [
    {
      type: "button",
      action: { type: "message", label: "📝 แจ้งปัญหา", text: "แจ้งปัญหา " },
      style: "primary",
      color: themeColor,
      height: "sm",
    },
    {
      type: "button",
      action: { type: "message", label: "📋 ดูตั๋วของฉัน", text: "ดูตั๋ว" },
      style: "secondary",
      height: "sm",
    },
    {
      type: "button",
      action: {
        type: "message",
        label: "🔍 ตรวจสอบสถานะ",
        text: "สถานะ #",
      },
      style: "secondary",
      height: "sm",
    },
  ];

  // เพิ่มปุ่มถามนาโนเฉพาะ PRO/ENTERPRISE
  if (plan === "PRO" || plan === "ENTERPRISE") {
    actions.push({
      type: "button",
      action: {
        type: "message",
        label: "🤖 ถามน้องนาโน",
        text: "ถาม ",
      },
      style: "secondary",
      height: "sm",
    });
  }

  return {
    type: "flex",
    altText: "เมนูน้องนาโน",
    contents: {
      type: "bubble",
      header: headerBox("เมนูหลัก", themeColor),
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "เลือกสิ่งที่ต้องการค่ะ 😊",
            size: "sm",
            color: "#555555",
            margin: "md",
          },
        ],
        paddingAll: "16px",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: actions,
        spacing: "sm",
        paddingAll: "16px",
      },
    },
  };
}

/**
 * เลือกระบบ — แสดงปุ่มเลือกระบบ (ใช้เมื่อไม่มี system code)
 * แสดงเฉพาะระบบที่อยู่ภายใน tenant เดียวกัน
 */
export function systemSelectFlex(
  systems: SystemInfo[],
  action: string = "แจ้งปัญหา",
  themeColor: string = "#0066FF"
) {
  const buttons = systems.map((sys) => ({
    type: "button",
    action: {
      type: "message",
      label: `${sys.icon || "⚙️"} ${sys.name}`,
      text: `${action} [${sys.code}] `,
    },
    style: "secondary" as const,
    height: "sm" as const,
  }));

  return {
    type: "flex",
    altText: "เลือกระบบ",
    contents: {
      type: "bubble",
      header: headerBox("เลือกระบบที่ต้องการแจ้ง", themeColor),
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "กรุณาเลือกระบบค่ะ 👇",
            size: "sm",
            color: "#555555",
          },
        ],
        paddingAll: "16px",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: buttons,
        spacing: "sm",
        paddingAll: "16px",
      },
    },
  };
}

/**
 * ยืนยัน ticket สร้างสำเร็จ
 */
export function ticketCreatedFlex(
  ticket: TicketInfo,
  liffUrl: string,
  themeColor: string = "#0066FF"
) {
  return {
    type: "flex",
    altText: `สร้าง Ticket #${ticket.ticketNo} สำเร็จ`,
    contents: {
      type: "bubble",
      header: headerBox("✅ สร้าง Ticket สำเร็จ", themeColor),
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `${ticket.systemPrefix ? `${ticket.systemPrefix}-` : "#"}${ticket.ticketNo}`,
            weight: "bold",
            size: "xl",
            color: themeColor,
          },
          {
            type: "text",
            text: ticket.title,
            size: "md",
            wrap: true,
            margin: "md",
          },
          { type: "separator", margin: "lg" },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              ...(ticket.systemName ? [infoRow("ระบบ", `${ticket.systemIcon || "⚙️"} ${ticket.systemName}`)] : []),
              ...(ticket.ticketType ? [infoRow("ประเภท", `${TICKET_TYPE_ICON[ticket.ticketType as keyof typeof TICKET_TYPE_ICON] || ""} ${TICKET_TYPE_LABEL[ticket.ticketType as keyof typeof TICKET_TYPE_LABEL] || ticket.ticketType}`)] : []),
              infoRow("สถานะ", STATUS_LABEL[ticket.status as keyof typeof STATUS_LABEL] || ticket.status),
              infoRow("ลำดับความสำคัญ", PRIORITY_LABEL[ticket.priority as keyof typeof PRIORITY_LABEL] || ticket.priority),
              ...(ticket.departmentName ? [infoRow("แผนก", ticket.departmentName)] : []),
            ],
          },
        ],
        paddingAll: "16px",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: {
              type: "uri",
              label: "ดูรายละเอียด",
              uri: liffUrl,
            },
            style: "primary",
            color: themeColor,
          },
        ],
        paddingAll: "16px",
      },
    },
  };
}

/**
 * รายการ ticket (Carousel max 10)
 */
export function ticketListFlex(
  tickets: TicketInfo[],
  liffBaseUrl: string,
  themeColor: string = "#0066FF"
) {
  if (tickets.length === 0) {
    return {
      type: "flex",
      altText: "ไม่พบ Ticket",
      contents: {
        type: "bubble",
        header: headerBox("📋 ตั๋วของฉัน", themeColor),
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "ยังไม่มี Ticket ในขณะนี้ค่ะ 😊",
              size: "sm",
              wrap: true,
              color: "#555555",
            },
          ],
          paddingAll: "16px",
        },
      },
    };
  }

  const bubbles = tickets.slice(0, 10).map((ticket) => ({
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `${ticket.systemPrefix ? `${ticket.systemPrefix}-` : "#"}${ticket.ticketNo}`,
          color: "#ffffff",
          size: "sm",
          weight: "bold",
        },
      ],
      backgroundColor: themeColor,
      paddingAll: "12px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        ...(ticket.systemName
          ? [
              {
                type: "text" as const,
                text: `${ticket.systemIcon || "⚙️"} ${ticket.systemName}`,
                size: "xxs" as const,
                color: "#888888" as const,
              },
            ]
          : []),
        {
          type: "text",
          text: ticket.title,
          weight: "bold",
          size: "sm",
          wrap: true,
          maxLines: 2,
        },
        {
          type: "text",
          text: STATUS_LABEL[ticket.status as keyof typeof STATUS_LABEL] || ticket.status,
          size: "xs",
          color: "#888888",
          margin: "sm",
        },
      ],
      paddingAll: "12px",
      spacing: "sm",
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          action: {
            type: "uri",
            label: "ดู",
            uri: `${liffBaseUrl}/ticket/${ticket.ticketNo}`,
          },
          style: "primary",
          color: themeColor,
          height: "sm",
        },
      ],
      paddingAll: "12px",
    },
  }));

  return {
    type: "flex",
    altText: `ตั๋วของฉัน (${tickets.length} รายการ)`,
    contents: {
      type: "carousel",
      contents: bubbles,
    },
  };
}

/**
 * สถานะ ticket
 */
export function ticketStatusFlex(
  ticket: TicketInfo,
  themeColor: string = "#0066FF"
) {
  return {
    type: "flex",
    altText: `สถานะ Ticket #${ticket.ticketNo}`,
    contents: {
      type: "bubble",
      header: headerBox(`📊 สถานะ Ticket #${ticket.ticketNo}`, themeColor),
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: ticket.title,
            weight: "bold",
            size: "md",
            wrap: true,
          },
          { type: "separator", margin: "lg" },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              ...(ticket.systemName ? [infoRow("ระบบ", `${ticket.systemIcon || "⚙️"} ${ticket.systemName}`)] : []),
              ...(ticket.ticketType ? [infoRow("ประเภท", `${TICKET_TYPE_ICON[ticket.ticketType as keyof typeof TICKET_TYPE_ICON] || ""} ${TICKET_TYPE_LABEL[ticket.ticketType as keyof typeof TICKET_TYPE_LABEL] || ticket.ticketType}`)] : []),
              infoRow("สถานะ", STATUS_LABEL[ticket.status as keyof typeof STATUS_LABEL] || ticket.status),
              infoRow("ลำดับความสำคัญ", PRIORITY_LABEL[ticket.priority as keyof typeof PRIORITY_LABEL] || ticket.priority),
              ...(ticket.departmentName ? [infoRow("แผนก", ticket.departmentName)] : []),
              ...(ticket.assignedToName ? [infoRow("ผู้รับผิดชอบ", ticket.assignedToName)] : []),
              infoRow("วันที่สร้าง", ticket.createdAt),
            ],
          },
        ],
        paddingAll: "16px",
      },
    },
  };
}

/**
 * ต้อนรับผู้ใช้ใหม่
 */
export function welcomeFlex(
  displayName: string,
  orgName: string,
  themeColor: string = "#0066FF"
) {
  return {
    type: "flex",
    altText: `ยินดีต้อนรับสู่ ${orgName}`,
    contents: {
      type: "bubble",
      header: headerBox("🎉 ยินดีต้อนรับ", themeColor),
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `สวัสดีค่ะ คุณ${displayName}! 👋`,
            weight: "bold",
            size: "lg",
            wrap: true,
          },
          {
            type: "text",
            text: `ยินดีต้อนรับสู่ระบบ ${orgName} ค่ะ`,
            size: "sm",
            color: "#555555",
            margin: "md",
            wrap: true,
          },
          {
            type: "text",
            text: 'พิมพ์ "ช่วย" เพื่อดูเมนูการใช้งานค่ะ',
            size: "sm",
            color: "#888888",
            margin: "md",
            wrap: true,
          },
        ],
        paddingAll: "16px",
      },
    },
  };
}

/**
 * แจ้ง upgrade
 */
export function upgradeRequiredFlex(
  currentPlan: Plan,
  themeColor: string = "#0066FF"
) {
  return {
    type: "flex",
    altText: "กรุณาอัปเกรดแผน",
    contents: {
      type: "bubble",
      header: headerBox("⬆️ อัปเกรดแผน", themeColor),
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `แผนปัจจุบัน: ${PLAN_LABEL[currentPlan]}`,
            size: "sm",
            color: "#555555",
          },
          {
            type: "text",
            text: "ฟีเจอร์ AI น้องนาโนใช้งานได้เฉพาะแผน Pro ขึ้นไปค่ะ",
            size: "sm",
            color: "#555555",
            wrap: true,
            margin: "md",
          },
          {
            type: "text",
            text: "อัปเกรดเพื่อปลดล็อกฟีเจอร์ทั้งหมด:",
            size: "sm",
            weight: "bold",
            margin: "lg",
          },
          {
            type: "text",
            text: "• Pro ฿2,990/เดือน — AI + ไม่จำกัดผู้ใช้",
            size: "xs",
            color: "#555555",
            margin: "sm",
          },
          {
            type: "text",
            text: "• Enterprise — Dedicated DB + SLA",
            size: "xs",
            color: "#555555",
            margin: "sm",
          },
        ],
        paddingAll: "16px",
      },
    },
  };
}

// ─── Helper ──────────────────────────────────────────────────

function infoRow(label: string, value: string) {
  return {
    type: "box",
    layout: "horizontal",
    contents: [
      {
        type: "text",
        text: label,
        size: "xs",
        color: "#aaaaaa",
        flex: 3,
      },
      {
        type: "text",
        text: value,
        size: "xs",
        color: "#333333",
        flex: 5,
        wrap: true,
      },
    ],
  };
}
