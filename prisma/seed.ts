// ─── น้องนาโน — Database Seed ─────────────────────────────────

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const defaultDepartments = ["ทั่วไป"];

const defaultCategories = [
  "ปัญหาอินเตอร์เน็ต",
  "ปัญหาคอมพิวเตอร์",
  "ปัญหาซอฟต์แวร์",
  "ปัญหาอีเมล",
  "ปัญหาเครื่องพิมพ์",
  "ปัญหาอุปกรณ์สำนักงาน",
  "อื่นๆ",
];

async function main() {
  console.log("🌱 เริ่มสร้างข้อมูลเริ่มต้น...");

  // ─── Platform Admin ──────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin1234", 12);
  const platformAdmin = await prisma.platformAdmin.upsert({
    where: { email: "admin@nanoticket.app" },
    update: {},
    create: {
      email: "admin@nanoticket.app",
      password: adminPassword,
    },
  });
  console.log(`✅ Platform Admin: ${platformAdmin.email}`);

  // ─── Demo Tenant ─────────────────────────────────────────
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      slug: "demo",
      name: "บริษัททดสอบ จำกัด",
      themeColor: "#0066FF",
      plan: "TRIAL",
      trialEndsAt,
      dbMode: "SHARED",
    },
  });
  console.log(`✅ Tenant: ${tenant.name} (${tenant.slug})`);

  // ─── Default Departments ─────────────────────────────────
  const departments: { id: string; name: string }[] = [];
  for (const deptName of defaultDepartments) {
    const dept = await prisma.department.upsert({
      where: {
        tenantId_name: { tenantId: tenant.id, name: deptName },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name: deptName,
      },
    });
    departments.push(dept);
    console.log(`  📁 แผนก: ${dept.name}`);
  }

  // ─── Default Categories ──────────────────────────────────
  const generalDept = departments.find((d) => d.name === "ทั่วไป");
  for (const catName of defaultCategories) {
    await prisma.category.upsert({
      where: {
        tenantId_departmentId_name: {
          tenantId: tenant.id,
          departmentId: generalDept?.id || "",
          name: catName,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        departmentId: generalDept?.id,
        name: catName,
      },
    });
    console.log(`  🏷️  หมวดหมู่: ${catName}`);
  }

  // ─── Demo Users ──────────────────────────────────────────
  const demoUsers = [
    {
      lineUid: "dev-super-admin",
      displayName: "ผู้ดูแลสูงสุด (ทดสอบ)",
      role: "SUPER_ADMIN" as const,
      departmentId: generalDept?.id,
    },
    {
      lineUid: "dev-admin",
      displayName: "ผู้ดูแลระบบ (ทดสอบ)",
      role: "ADMIN" as const,
      departmentId: generalDept?.id,
    },
    {
      lineUid: "dev-dept-admin",
      displayName: "หัวหน้าแผนก (ทดสอบ)",
      role: "DEPT_ADMIN" as const,
      departmentId: generalDept?.id,
    },
    {
      lineUid: "dev-it",
      displayName: "เจ้าหน้าที่ IT (ทดสอบ)",
      role: "IT" as const,
      departmentId: generalDept?.id,
    },
    {
      lineUid: "dev-user",
      displayName: "ผู้ใช้งาน (ทดสอบ)",
      role: "USER" as const,
      departmentId: generalDept?.id,
    },
  ];

  for (const userData of demoUsers) {
    const user = await prisma.user.upsert({
      where: {
        tenantId_lineUid: {
          tenantId: tenant.id,
          lineUid: userData.lineUid,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        ...userData,
      },
    });
    console.log(`  👤 ${user.displayName} (${user.role})`);
  }

  // ─── Default Systems ───────────────────────────────────────
  const defaultSystems = [
    { code: "hris",       name: "HRIS",           icon: "👥",  color: "#3B82F6", ticketPrefix: "HRS", description: "ระบบบริหารทรัพยากรบุคคล" },
    { code: "marketing",  name: "Marketing",      icon: "📢",  color: "#EC4899", ticketPrefix: "MKT", description: "ระบบการตลาด" },
    { code: "accounting", name: "Accounting",     icon: "💰",  color: "#22C55E", ticketPrefix: "ACC", description: "ระบบบัญชี" },
    { code: "crm",        name: "CRM",            icon: "🤝",  color: "#F59E0B", ticketPrefix: "CRM", description: "ระบบจัดการลูกค้าสัมพันธ์" },
    { code: "ecommerce",  name: "E-Commerce",     icon: "🛒",  color: "#8B5CF6", ticketPrefix: "ECM", description: "ระบบร้านค้าออนไลน์" },
  ];

  for (const sys of defaultSystems) {
    const system = await prisma.system.upsert({
      where: {
        tenantId_code: { tenantId: tenant.id, code: sys.code },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        ...sys,
      },
    });
    console.log(`  ⚙️  ระบบ: ${system.icon} ${system.name} (${system.code}) — prefix: ${system.ticketPrefix}`);
  }

  console.log("\n🎉 สร้างข้อมูลเริ่มต้นเสร็จสมบูรณ์!");
}

main()
  .catch((e) => {
    console.error("❌ Seed ล้มเหลว:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
