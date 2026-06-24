// ─── น้องนาโน — Gemini AI Bot Engine ────────────────────────
// ใช้ DATABASE_READONLY_URL เท่านั้น (SELECT เท่านั้น, parameterized)
// ป้องกัน SQL Injection ด้วย Prisma ORM + allowlist whitelist

import { GoogleGenerativeAI } from "@google/generative-ai";
import { Role } from "@prisma/client";
import prismaReadonly from "./prisma-readonly";

// ─── Allowlist ของ field ที่อนุญาตให้ query ──────────────────
const ALLOWED_STATUS = ["OPEN", "IN_PROGRESS", "PENDING", "RESOLVED", "CLOSED"];
const ALLOWED_PRIORITY = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const ALLOWED_TICKET_TYPE = ["BUG", "FEATURE", "TASK", "QUESTION"];

// ─── Block SQL injection keywords ────────────────────────────────────
const SQL_INJECT_KEYWORDS = ["union", "select *", "drop ", "insert ", "update ", "delete ", "exec(", "execute(", "xp_cmd"];
function containsSqlInjection(text: string): boolean {
  const lower = text.toLowerCase();
  return SQL_INJECT_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── Block อักขระอันตรายใน free-text input ──────────────────

export interface BotQueryContext {
  tenantId: string;
  userId: string;
  departmentId: string | null;
  userRole: Role;
  botName?: string;
  botPersona?: string;
  systemPrompt?: string | null;
  aiModel?: string;
}

// ─── Auto-categorize: วิเคราะห์ข้อความ → priority + category ─
export interface TicketAnalysis {
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  suggestedTitle: string;
  suggestedCategory?: string;
  ticketType: "BUG" | "FEATURE" | "TASK" | "QUESTION";
  emoji: string;
}

/**
 * วิเคราะห์ข้อความ ticket ด้วย Gemini → คืน priority, type, title
 * ป้องกัน prompt injection ด้วยการ sanitize input
 */
export async function analyzeTicket(
  rawText: string,
  categories: string[],
  apiKey: string,
  model: string = "gemini-3-flash-preview"
): Promise<TicketAnalysis> {
  // sanitize — ตัด special characters ที่อาจ inject prompt
  const sanitized = rawText
    .replace(/[<>{}[\]\\]/g, "")
    .substring(0, 500);

  const genAI = new GoogleGenerativeAI(apiKey);
  const gemini = genAI.getGenerativeModel({ model });

  const categoryList = categories.length > 0 ? categories.join(", ") : "ไม่มีหมวดหมู่";

  const prompt = `วิเคราะห์ข้อความแจ้งปัญหาต่อไปนี้และตอบเป็น JSON เท่านั้น ห้ามเพิ่มข้อความอื่น:

ข้อความ: """${sanitized}"""
หมวดหมู่ที่มี: ${categoryList}

ตอบ JSON รูปแบบนี้:
{
  "priority": "LOW|MEDIUM|HIGH|URGENT",
  "ticketType": "BUG|FEATURE|TASK|QUESTION",
  "suggestedTitle": "สรุปปัญหาสั้นๆ ภาษาไทย ไม่เกิน 60 ตัวอักษร",
  "suggestedCategory": "ชื่อหมวดหมู่ที่ตรงที่สุด หรือ null",
  "emoji": "emoji เดียวที่เหมาะสม"
}

กฎ priority:
- URGENT: ระบบล่ม, ใช้งานไม่ได้, ด่วนมาก, emergency
- HIGH: ปัญหาสำคัญ, กระทบงาน, ด่วน  
- MEDIUM: ปัญหาทั่วไป, ค่าเริ่มต้น
- LOW: แนะนำ, ข้อสังเกต, ไม่เร่งด่วน`;

  try {
    const result = await gemini.generateContent(prompt);
    const text = result.response.text().trim();

    // extract JSON จาก response (กรณี Gemini ใส่ markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = JSON.parse(jsonMatch[0]);

    // validate ค่าก่อน return — ป้องกัน AI hallucination inject ค่าผิด
    return {
      priority: ALLOWED_PRIORITY.includes(parsed.priority) ? parsed.priority : "MEDIUM",
      ticketType: ALLOWED_TICKET_TYPE.includes(parsed.ticketType) ? parsed.ticketType : "BUG",
      suggestedTitle: String(parsed.suggestedTitle || sanitized).substring(0, 100),
      suggestedCategory: parsed.suggestedCategory || undefined,
      emoji: String(parsed.emoji || "🎫").substring(0, 2),
    };
  } catch {
    // fallback: วิเคราะห์ด้วย keyword แบบ simple
    return fallbackAnalyze(rawText);
  }
}

/**
 * Fallback: วิเคราะห์ priority จาก keyword + emoji (ไม่ต้องใช้ AI)
 */
export function fallbackAnalyze(text: string): TicketAnalysis {
  const lower = text.toLowerCase();

  // Emoji priority
  if (text.includes("🔴") || text.includes("🆘")) {
    return { priority: "URGENT", ticketType: "BUG", suggestedTitle: text.replace(/[🔴🆘]/g, "").trim().substring(0, 100), emoji: "🔴" };
  }
  if (text.includes("🟡") || text.includes("⚠️")) {
    return { priority: "HIGH", ticketType: "BUG", suggestedTitle: text.replace(/[🟡⚠️]/g, "").trim().substring(0, 100), emoji: "⚠️" };
  }
  if (text.includes("🟢")) {
    return { priority: "LOW", ticketType: "TASK", suggestedTitle: text.replace(/🟢/g, "").trim().substring(0, 100), emoji: "🟢" };
  }

  // Keyword priority
  if (/ล่ม|ใช้งานไม่ได้|หยุด|crash|down|ด่วนมาก|emergency/.test(lower)) {
    return { priority: "URGENT", ticketType: "BUG", suggestedTitle: text.substring(0, 100), emoji: "🚨" };
  }
  if (/ช้า|error|ผิดพลาด|ไม่ทำงาน|bug|ด่วน/.test(lower)) {
    return { priority: "HIGH", ticketType: "BUG", suggestedTitle: text.substring(0, 100), emoji: "🔥" };
  }
  if (/อยาก|ขอ|เพิ่ม|feature|ฟีเจอร์/.test(lower)) {
    return { priority: "MEDIUM", ticketType: "FEATURE", suggestedTitle: text.substring(0, 100), emoji: "✨" };
  }
  if (/ถาม|สอบถาม|ไม่รู้|วิธี|how/.test(lower)) {
    return { priority: "LOW", ticketType: "QUESTION", suggestedTitle: text.substring(0, 100), emoji: "❓" };
  }

  return { priority: "MEDIUM", ticketType: "BUG", suggestedTitle: text.substring(0, 100), emoji: "🎫" };
}

// ─── AI Database Query (READ-ONLY) ───────────────────────────

/**
 * ถาม Gemini เกี่ยวกับข้อมูลในระบบ
 * - ใช้ Prisma ORM เท่านั้น (parameterized queries → SQL injection proof)
 * - ใช้ DATABASE_READONLY_URL
 * - Scope ทุกอย่างด้วย tenantId
 */
export async function queryDatabase(
  question: string,
  context: BotQueryContext
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "🔧 ระบบ AI ยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแลระบบ";

  // ─── ป้องกัน prompt injection ────────────────────────────
  const sanitizedQuestion = question
    .replace(/[<>{}[\]\\]/g, "")
    .substring(0, 300);

  if (containsSqlInjection(sanitizedQuestion)) {
    return `❌ น้องนาโนไม่สามารถประมวลผลคำขอนี้ได้${context.botPersona || "ค่ะ"}`;
  }

  // ─── ดึงข้อมูลจาก DB ด้วย Prisma (parameterized, readonly) ─
  const snapshot = await fetchTenantSnapshot(context);

  // ─── สร้าง System Prompt ──────────────────────────────────
  const systemPromptText = buildSystemPrompt(context, snapshot);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: context.aiModel || "gemini-3-flash-preview",
  });

  try {
    const result = await model.generateContent([
      { text: systemPromptText },
      { text: `คำถาม: ${sanitizedQuestion}` },
    ]);

    return result.response.text();
  } catch (error) {
    console.error("Gemini query error:", error);
    return `❌ เกิดข้อผิดพลาดในการประมวลผล${context.botPersona || "ค่ะ"} กรุณาลองใหม่อีกครั้ง`;
  }
}

// ─── Fetch snapshot จาก DB (readonly, parameterized) ─────────
interface TenantSnapshot {
  totalOpen: number;
  totalInProgress: number;
  totalResolved: number;
  totalUrgent: number;
  myTickets: number;
  recentTickets: Array<{
    no: number;
    title: string;
    status: string;
    priority: string;
    system: string;
    createdAt: string;
  }>;
  departments: string[];
  systems: string[];
}

async function fetchTenantSnapshot(ctx: BotQueryContext): Promise<TenantSnapshot> {
  // ทุก query ต้อง scope ด้วย tenantId (parameterized ผ่าน Prisma)
  const where = {
    tenantId: ctx.tenantId,
    // dept filter สำหรับ role ที่ไม่ใช่ admin
    ...(ctx.userRole !== "ADMIN" && ctx.userRole !== "SUPER_ADMIN" && ctx.departmentId
      ? { departmentId: ctx.departmentId }
      : {}),
  };

  const [open, inProgress, resolved, urgent, myTickets, recent, depts, systems] =
    await Promise.all([
      prismaReadonly.ticket.count({ where: { ...where, status: "OPEN" } }),
      prismaReadonly.ticket.count({ where: { ...where, status: "IN_PROGRESS" } }),
      prismaReadonly.ticket.count({ where: { ...where, status: "RESOLVED" } }),
      prismaReadonly.ticket.count({ where: { ...where, priority: "URGENT" } }),
      prismaReadonly.ticket.count({ where: { ...where, createdById: ctx.userId } }),
      prismaReadonly.ticket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          ticketNo: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
          system: { select: { name: true, ticketPrefix: true } },
        },
      }),
      prismaReadonly.department.findMany({
        where: { tenantId: ctx.tenantId, isActive: true },
        select: { name: true },
      }),
      prismaReadonly.system.findMany({
        where: { tenantId: ctx.tenantId, isActive: true },
        select: { name: true, code: true },
      }),
    ]);

  return {
    totalOpen: open,
    totalInProgress: inProgress,
    totalResolved: resolved,
    totalUrgent: urgent,
    myTickets,
    recentTickets: recent.map((t) => ({
      no: t.ticketNo,
      title: t.title,
      status: t.status,
      priority: t.priority,
      system: t.system ? `${t.system.ticketPrefix}-${t.ticketNo}` : `#${t.ticketNo}`,
      createdAt: t.createdAt.toLocaleDateString("th-TH"),
    })),
    departments: depts.map((d) => d.name),
    systems: systems.map((s) => `${s.name} [${s.code}]`),
  };
}

// ─── Build System Prompt ──────────────────────────────────────
function buildSystemPrompt(ctx: BotQueryContext, snap: TenantSnapshot): string {
  const botName = ctx.botName || "น้องนาโน";
  const persona = ctx.botPersona || "ค่ะ";

  // ใช้ custom prompt ถ้ามี
  if (ctx.systemPrompt) {
    return `${ctx.systemPrompt}

ข้อมูลปัจจุบัน (อัปเดตล่าสุด):
- Ticket เปิดอยู่: ${snap.totalOpen} ใบ
- กำลังดำเนินการ: ${snap.totalInProgress} ใบ  
- แก้ไขแล้ว: ${snap.totalResolved} ใบ
- ด่วนมาก (URGENT): ${snap.totalUrgent} ใบ
- Ticket ของฉัน: ${snap.myTickets} ใบ

Ticket ล่าสุด 5 ใบ:
${snap.recentTickets.map((t) => `• ${t.system} "${t.title}" — ${t.status} (${t.priority})`).join("\n")}

ระบบ: ${snap.systems.join(", ") || "ไม่มี"}
แผนก: ${snap.departments.join(", ") || "ไม่มี"}`;
  }

  return `คุณคือ "${botName}" ผู้ช่วย AI ของระบบ Service Ticket
คุณตอบเป็นภาษาไทย ลงท้ายด้วย "${persona}"
ขึ้นต้นด้วย "🔍 ${botName}ตรวจสอบให้แล้ว${persona}"

กฎสำคัญ:
1. ตอบเฉพาะคำถามเกี่ยวกับ ticket และระบบ — ห้ามตอบคำถามนอกขอบเขต
2. อย่าเปิดเผย tenantId, userId, หรือข้อมูล internal ใดๆ
3. ถ้าไม่มีข้อมูล ให้แจ้งว่า "${botName}ไม่มีข้อมูลส่วนนี้${persona}"

ข้อมูลสรุปปัจจุบัน:
- Ticket เปิดอยู่: ${snap.totalOpen} ใบ
- กำลังดำเนินการ: ${snap.totalInProgress} ใบ
- แก้ไขแล้ว: ${snap.totalResolved} ใบ
- ด่วนมาก (URGENT): ${snap.totalUrgent} ใบ
- Ticket ของฉัน: ${snap.myTickets} ใบ

Ticket ล่าสุด 5 ใบ:
${snap.recentTickets.map((t) => `• ${t.system} "${t.title}" — ${t.status} (${t.priority}) วันที่ ${t.createdAt}`).join("\n")}

ระบบที่มี: ${snap.systems.join(", ") || "ยังไม่มี"}
แผนก: ${snap.departments.join(", ") || "ยังไม่มี"}

สถานะ: OPEN=เปิด, IN_PROGRESS=กำลังดำเนินการ, PENDING=รอข้อมูล, RESOLVED=แก้ไขแล้ว, CLOSED=ปิด
Priority: LOW=ต่ำ, MEDIUM=ปานกลาง, HIGH=สูง, URGENT=ด่วนมาก`;
}
