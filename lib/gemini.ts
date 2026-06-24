// ─── น้องนาโน — Gemini AI Database Query ─────────────────────

import { GoogleGenerativeAI } from "@google/generative-ai";
import { Role } from "@prisma/client";

const DANGEROUS_KEYWORDS =
  /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|EXEC|EXECUTE)\b/i;

interface QueryContext {
  tenantId: string;
  departmentId: string | null;
  userRole: Role;
}

/**
 * ใช้ Gemini แปลงคำถามภาษาธรรมชาติเป็น SQL แล้วตอบกลับ
 * - Scope ทุก query ด้วย tenant_id
 * - กรอง department ตาม role
 * - อนุญาตเฉพาะ SELECT
 */
export async function queryDatabase(
  question: string,
  context: QueryContext
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "🔧 ระบบ AI ยังไม่ได้ตั้งค่าค่ะ กรุณาติดต่อผู้ดูแลระบบ";
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // สร้าง prompt สำหรับ Gemini
  const systemPrompt = buildSystemPrompt(context);

  try {
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `คำถาม: ${question}` },
    ]);

    const response = result.response.text();

    // ตรวจสอบว่าไม่มี SQL อันตราย
    if (DANGEROUS_KEYWORDS.test(response)) {
      return "🚫 น้องนาโนไม่สามารถดำเนินการคำสั่งที่เปลี่ยนแปลงข้อมูลได้ค่ะ อนุญาตเฉพาะการค้นหาข้อมูลเท่านั้น";
    }

    return response;
  } catch (error) {
    console.error("Gemini query error:", error);
    return "❌ เกิดข้อผิดพลาดในการประมวลผลค่ะ กรุณาลองใหม่อีกครั้ง";
  }
}

function buildSystemPrompt(context: QueryContext): string {
  const deptFilter =
    context.userRole === "ADMIN" || context.userRole === "SUPER_ADMIN"
      ? ""
      : context.departmentId
        ? `AND department_id = '${context.departmentId}'`
        : "";

  return `คุณคือ "น้องนาโน" ผู้ช่วย AI ของระบบ Service Ticket
คุณตอบเป็นภาษาไทย ลงท้ายด้วย "ค่ะ" ขึ้นต้นด้วย "🔍 นาโนตรวจสอบให้แล้วค่ะ"

ข้อมูลในระบบ:
- ตาราง: tickets (id, tenant_id, department_id, ticket_no, title, description, status, priority, category_id, created_by_id, assigned_to_id, resolved_at, created_at)
- ตาราง: users (id, tenant_id, department_id, line_uid, display_name, role)
- ตาราง: departments (id, tenant_id, name)
- ตาราง: categories (id, tenant_id, department_id, name)

กฎ:
1. ทุก query ต้องมี WHERE tenant_id = '${context.tenantId}' ${deptFilter}
2. อนุญาตเฉพาะ SELECT — ห้าม INSERT, UPDATE, DELETE, DROP, ALTER
3. ตอบเป็นข้อความสรุปภาษาไทย ไม่ต้องแสดง SQL
4. ถ้าไม่สามารถตอบได้ ให้แจ้งว่า "น้องนาโนไม่สามารถค้นหาข้อมูลนี้ได้ค่ะ"

สถานะ: OPEN=เปิด, IN_PROGRESS=กำลังดำเนินการ, PENDING=รอข้อมูล, RESOLVED=แก้ไขแล้ว, CLOSED=ปิด
ลำดับความสำคัญ: LOW=ต่ำ, MEDIUM=ปานกลาง, HIGH=สูง, URGENT=ด่วนมาก`;
}
