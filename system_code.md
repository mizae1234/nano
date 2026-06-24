# 📖 น้องนาโน — System Code Documentation

## Tech Stack
- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS v3 + Google Fonts (Sarabun)
- **ORM**: Prisma 7.8
- **Database**: PostgreSQL (Shared/Dedicated per tenant)
- **Auth**: NextAuth.js v5 (JWT strategy)
- **LINE**: LINE LIFF SDK + Messaging API
- **AI**: Google Gemini 2.0 Flash
- **Icons**: Lucide React

---

## โครงสร้างไฟล์

```
nano/
├── app/
│   ├── layout.tsx                    # Root layout (Sarabun font, Thai SEO)
│   ├── page.tsx                      # Landing page
│   ├── globals.css                   # Design system (glassmorphism, nano theme)
│   │
│   ├── register/page.tsx             # ฟอร์มสมัคร tenant
│   ├── login/page.tsx                # LINE Login + Dev bypass
│   ├── login-platform/page.tsx       # Platform admin login
│   ├── expired/page.tsx              # Trial expired + upgrade CTA
│   │
│   ├── (dashboard)/                  # Tenant dashboard (route group)
│   │   ├── layout.tsx                # Sidebar + topbar + role-based menu
│   │   ├── ticket/page.tsx           # ปัญหาของฉัน (USER)
│   │   ├── ticket/new/page.tsx       # แจ้งปัญหาใหม่
│   │   ├── ticket/[id]/page.tsx      # รายละเอียด ticket
│   │   ├── it/page.tsx               # คิวงาน IT
│   │   ├── dept/page.tsx             # Ticket ในแผนก (DEPT_ADMIN)
│   │   ├── dept/members/page.tsx     # สมาชิกในแผนก
│   │   ├── admin/page.tsx            # ทุก Ticket (ADMIN)
│   │   ├── admin/users/page.tsx      # จัดการผู้ใช้
│   │   ├── admin/departments/page.tsx # จัดการแผนก
│   │   ├── admin/categories/page.tsx # จัดการหมวดหมู่
│   │   ├── admin/report/page.tsx     # รายงานและสถิติ
│   │   └── settings/page.tsx         # ตั้งค่าระบบ (SUPER_ADMIN)
│   │
│   ├── platform/page.tsx             # Platform admin dashboard
│   │
│   └── api/
│       ├── auth/[...nextauth]/route.ts   # NextAuth handlers
│       ├── tickets/route.ts              # GET (list) + POST (create)
│       ├── tickets/[id]/route.ts         # GET (detail) + PATCH (update)
│       ├── tickets/[id]/comments/route.ts # GET + POST comments
│       ├── users/route.ts               # GET + POST users
│       ├── users/[id]/role/route.ts      # PATCH role
│       ├── users/[id]/department/route.ts # PATCH department
│       ├── departments/route.ts          # GET + POST
│       ├── departments/[id]/route.ts     # PATCH + DELETE
│       ├── tenant/settings/route.ts      # GET + PATCH org settings
│       ├── tenant/line/route.ts          # POST LINE OA connection
│       ├── tenant/migrate/route.ts       # GET status + POST trigger
│       ├── bot/query/route.ts            # POST Gemini AI query
│       ├── webhook/line/route.ts         # POST LINE webhook
│       └── platform/
│           ├── tenants/route.ts          # GET + POST tenants
│           ├── tenants/[id]/route.ts     # GET + PATCH tenant
│           └── tenants/[id]/migrate/route.ts # POST migration
│
├── lib/
│   ├── auth.ts           # NextAuth config (LINE LIFF + Dev Bypass providers)
│   ├── prisma.ts         # Global Prisma client (singleton)
│   ├── prisma-readonly.ts # Read replica client
│   ├── prisma-tenant.ts  # Per-tenant client cache (Map<tenantId, PrismaClient>)
│   ├── encrypt.ts        # AES-256-GCM encryption (LINE tokens, DB URLs)
│   ├── tenant.ts         # Tenant resolver, role checks, ticket WHERE builder
│   ├── plan-limits.ts    # SaaS tier limits & guard functions
│   ├── labels.ts         # Thai UI labels constants
│   ├── line.ts           # LINE Messaging API (reply, push, multicast, test)
│   ├── nano-router.ts    # Keyword command parser (LINE → NanoAction)
│   ├── nano-reply.ts     # Flex Message builders (menu, ticket, carousel)
│   ├── gemini.ts         # Gemini AI query (NL → SQL → Thai answer)
│   └── migrate.ts        # Shared → Dedicated DB migration
│
├── prisma/
│   ├── schema.prisma     # Full DB schema (11 models)
│   └── seed.ts           # Demo data seeder
│
├── middleware.ts          # Tenant resolution, public path bypass
├── bot_skill.md           # Bot commands & DB schema reference
├── system_code.md         # This file
├── tailwind.config.ts     # Theme (nano color, glassmorphism, animations)
└── .env.local             # Environment variables
```

---

## Core Architecture Patterns

### 1. Multi-tenancy (แยก tenant)
- **Resolution**: `middleware.ts` ดึง slug จาก subdomain (prod) หรือ `?tenant=` query param (dev)
- **Data isolation**: ทุก query ต้อง WHERE `tenantId = ...`
- **DB modes**:
  - `SHARED`: ทุก tenant ใช้ DB เดียวกัน
  - `DEDICATED`: Enterprise ได้ DB แยก, `lib/prisma-tenant.ts` จัดการ client cache

### 2. Role-based Access
- ลำดับชั้น: `USER < IT < DEPT_ADMIN < ADMIN < SUPER_ADMIN`
- `hasMinRole(userRole, requiredRole)` — ตรวจสอบสิทธิ์
- `canAccessTicket(role, userId, deptId, ticket)` — ตรวจสอบ ticket access
- `getTicketWhereByRole(tenantId, role, userId, deptId)` — สร้าง Prisma WHERE

### 3. Encryption
- `AES-256-GCM` สำหรับข้อมูลลับ (LINE tokens, DB URLs)
- Key จาก `ENCRYPTION_KEY` env var
- Format: `iv:authTag:encrypted` (base64)

### 4. LINE Integration Flow
```
LINE → Webhook → validateSignature → parseNanoCommand → NanoAction
                                                          ↓
                                    ┌─── CREATE_TICKET → สร้าง ticket + ticketCreatedFlex
                                    ├─── LIST_TICKETS → query + ticketListFlex (carousel)
                                    ├─── CHECK_STATUS → query + ticketStatusFlex
                                    ├─── GEMINI_QUERY → queryDatabase → text reply
                                    ├─── SHOW_MENU → menuFlex
                                    └─── UPGRADE_REQUIRED → upgradeRequiredFlex
```

### 5. Plan Guard
- `checkLimit(plan, resource, currentCount)` → `{ allowed, message }`
- ตรวจสอบก่อนสร้าง ticket/user/department

### 6. Audit Log
- ทุกการเปลี่ยนแปลง ticket จะสร้าง `AuditLog`
- Actions: `CREATED`, `UPDATED`, `COMMENTED`, `ASSIGNED`

---

## Environment Variables (.env.local)

| Variable | ใช้ใน | Description |
|----------|-------|-------------|
| DATABASE_URL | Prisma | PostgreSQL connection string |
| DATABASE_READ_URL | prisma-readonly | Read replica (optional) |
| NEXTAUTH_SECRET | NextAuth | JWT signing key |
| NEXTAUTH_URL | NextAuth | App base URL |
| ENCRYPTION_KEY | encrypt.ts | AES-256 key (32 chars hex) |
| NEXT_PUBLIC_LIFF_ID | LIFF | LINE LIFF App ID |
| GEMINI_API_KEY | gemini.ts | Google Gemini API key |
| DEV_BYPASS_LOGIN | auth.ts | "true" เพื่อเปิด dev login |
| DEV_TENANT_SLUG | middleware | Default tenant สำหรับ dev |
| NEXT_PUBLIC_APP_DOMAIN | middleware | Production domain |

---

## API Response Patterns

### Success
```json
{ "tickets": [...], "pagination": { "page": 1, "limit": 20, "total": 100 } }
```

### Error
```json
{ "error": "ข้อความ error เป็นภาษาไทย" }
```

### Status Codes
- `200` — OK
- `201` — Created
- `202` — Accepted (background job started)
- `400` — Bad request
- `401` — Unauthorized
- `403` — Forbidden (plan limit / role)
- `404` — Not found
- `500` — Server error
