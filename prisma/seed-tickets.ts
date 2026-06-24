import { PrismaClient, TicketStatus, Priority, TicketType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const TICKET_TEMPLATES = [
  { title: "คอมพิวเตอร์เปิดไม่ติด หน้าจอดำสนิท", desc: "ลองกดปุ่ม Power หลายรอบแล้ว ไม่มีไฟสถานะขึ้นเลย สายไฟเสียบแน่นดีแล้ว", type: TicketType.BUG, sysCode: "hris" },
  { title: "ขอเพิ่มฟีเจอร์คำนวณภาษีหัก ณ ที่จ่าย", desc: "อยากให้ระบบ HRIS คำนวณยอดหัก ณ ที่จ่ายและพิมพ์เอกสาร 50 ทวิได้ทันทีตอนจ่ายเงินเดือน", type: TicketType.FEATURE, sysCode: "hris" },
  { title: "แก้ไขราคาแคมเปญ 6.6 ผิดพลาด", desc: "ราคาบนหน้าเว็บแสดงผลโปรโมชั่นส่วนลดไม่ถูกต้อง รบกวนเจ้าหน้าที่ตรวจสอบแก้ไขด่วน", type: TicketType.BUG, sysCode: "marketing" },
  { title: "ขอไฟล์สรุปยอดขายแยกตามรายภาคของปี 2025", desc: "ต้องการข้อมูลดิบเพื่อนำไปทำสไลด์สรุปประชุมไตรมาสถัดไป", type: TicketType.TASK, sysCode: "marketing" },
  { title: "พิมพ์ใบเสร็จรับเงินแล้วกระดาษติดในเครื่อง", desc: "เครื่องพิมพ์ในแผนกบัญชีมีเสียงดังแปลกๆ และกระดาษชอบติดตรงถาดขาออก", type: TicketType.BUG, sysCode: "accounting" },
  { title: "สอบถามวิธีการปิดงบรายเดือนในระบบใหม่", desc: "มีขั้นตอนใดบ้างที่ต้องทำเป็นพิเศษเพื่อล็อกข้อมูลบัญชีประจำเดือนพฤษภาคม", type: TicketType.QUESTION, sysCode: "accounting" },
  { title: "ลูกค้ากดสมัครสมาชิกไม่ได้ ขึ้นข้อความ Error 500", desc: "ตรวจสอบหลังบ้านพบหน้าลงทะเบียน CRM มีปัญหาการเชื่อมต่อฐานข้อมูลเป็นระยะ", type: TicketType.BUG, sysCode: "crm" },
  { title: "ต้องการย้ายฐานข้อมูลลูกค้าไปยังระบบใหม่", desc: "อยากให้ IT ช่วยย้ายข้อมูลรายชื่อผู้ติดต่อจากระบบเก่ามาใส่ระบบ CRM", type: TicketType.TASK, sysCode: "crm" },
  { title: "ระบบชำระเงินตัดบัตรเครดิตล้มเหลวบ่อย", desc: "ลูกค้าบนเว็บ E-Commerce ร้องเรียนเข้ามาว่าไม่สามารถชำระเงินด้วยบัตร VISA ได้สำเร็จ", type: TicketType.BUG, sysCode: "ecommerce" },
  { title: "ขอแก้ไขหน้าต่าง Pop-up แสดงโปรโมชั่นหน้าร้าน", desc: "ต้องการเปลี่ยนข้อความและรูปภาพแบนเนอร์ต้อนรับของ E-Commerce เป็นแคมเปญใหม่", type: TicketType.TASK, sysCode: "ecommerce" },
];

async function main() {
  console.log("🌱 Starting ticket seed...");

  const tenant = await prisma.tenant.findUnique({
    where: { slug: "demo" },
  });

  if (!tenant) {
    console.error("❌ Tenant 'demo' not found! Run npm run db:seed first.");
    process.exit(1);
  }

  // Get users
  const creator = await prisma.user.findFirst({
    where: { tenantId: tenant.id, lineUid: "dev-user" },
  });

  const assignee = await prisma.user.findFirst({
    where: { tenantId: tenant.id, lineUid: "dev-it" },
  });

  if (!creator || !assignee) {
    console.error("❌ Demo users not found! Run npm run db:seed first.");
    process.exit(1);
  }

  // Get active departments
  const defaultDept = await prisma.department.findFirst({
    where: { tenantId: tenant.id },
  });

  const statuses = [
    TicketStatus.OPEN,
    TicketStatus.IN_PROGRESS,
    TicketStatus.PENDING,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ];

  const priorities = [
    Priority.LOW,
    Priority.MEDIUM,
    Priority.HIGH,
    Priority.URGENT,
  ];

  // Seed tickets
  for (let i = 0; i < TICKET_TEMPLATES.length; i++) {
    const template = TICKET_TEMPLATES[i];
    const system = await prisma.system.findFirst({
      where: { tenantId: tenant.id, code: template.sysCode },
    });

    if (!system) {
      console.warn(`⚠️ System with code '${template.sysCode}' not found. Skipping.`);
      continue;
    }

    // Determine the next ticket number for this system
    const lastTicket = await prisma.ticket.findFirst({
      where: { tenantId: tenant.id, systemId: system.id },
      orderBy: { ticketNo: "desc" },
    });
    const nextNo = (lastTicket?.ticketNo || 0) + 1;

    // Pick random priority and status
    const priority = priorities[i % priorities.length];
    const status = statuses[i % statuses.length];

    const ticket = await prisma.ticket.create({
      data: {
        tenantId: tenant.id,
        ticketNo: nextNo,
        title: template.title,
        description: template.desc,
        ticketType: template.type,
        status: status,
        priority: priority,
        createdById: creator.id,
        assignedToId: status !== TicketStatus.OPEN ? assignee.id : null,
        departmentId: defaultDept?.id || null,
        systemId: system.id,
        resolvedAt: status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED ? new Date() : null,
      },
    });

    console.log(`✅ Ticket Created: ${system.ticketPrefix}-${ticket.ticketNo} - ${ticket.title} (${ticket.status})`);
  }

  console.log("🎉 Seeding 10 tickets completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seed tickets failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
