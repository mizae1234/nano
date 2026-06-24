# 🤖 น้องนาโน — Bot Skill & Database Schema

## ภาพรวม
น้องนาโนเป็น AI Assistant ที่ทำงานผ่าน LINE Messaging API สำหรับระบบ Service Ticket แบบ Multi-tenant

---

## Database Schema

### Tenant (องค์กร)
| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| slug | String (unique) | Subdomain ขององค์กร เช่น `demo` → `demo.nanoticket.app` |
| name | String | ชื่อองค์กร |
| logoUrl | String? | URL โลโก้ |
| themeColor | String | สีธีม (default: `#0066FF`) |
| plan | Enum: TRIAL, STARTER, PRO, ENTERPRISE | แผนการใช้งาน |
| trialEndsAt | DateTime? | วันหมดอายุทดลองใช้ |
| isActive | Boolean | สถานะเปิด/ปิด |
| dbMode | Enum: SHARED, DEDICATED | โหมดฐานข้อมูล |
| dedicatedDbUrl | String? | URL ของ Dedicated DB (เข้ารหัส AES-256-GCM) |
| lineOaToken | String? | LINE Channel Access Token (เข้ารหัส) |
| lineOaSecret | String? | LINE Channel Secret (เข้ารหัส) |
| lineOaGroupId | String? | LINE Group ID |

### Department (แผนก)
| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| tenantId | String (FK → Tenant) | องค์กรที่สังกัด |
| name | String | ชื่อแผนก |
| description | String? | คำอธิบาย |
| isActive | Boolean | สถานะเปิด/ปิด |

**Unique:** `tenantId + name`

### User (ผู้ใช้)
| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| tenantId | String (FK → Tenant) | องค์กรที่สังกัด |
| departmentId | String? (FK → Department) | แผนกที่สังกัด |
| lineUid | String | LINE User ID |
| displayName | String | ชื่อแสดง |
| pictureUrl | String? | URL รูปโปรไฟล์ LINE |
| role | Enum: USER, IT, DEPT_ADMIN, ADMIN, SUPER_ADMIN | บทบาท |

**Unique:** `tenantId + lineUid`

### Role Hierarchy (ลำดับชั้นบทบาท)
```
USER (0) → IT (1) → DEPT_ADMIN (2) → ADMIN (3) → SUPER_ADMIN (4)
```

| Role | สิทธิ์ |
|------|--------|
| USER | ดู/สร้าง ticket ของตัวเอง |
| IT | ดู/แก้ไข ticket ที่ถูก assign |
| DEPT_ADMIN | ดูทุก ticket ในแผนก + จัดการสมาชิก |
| ADMIN | ดูทุก ticket ในองค์กร + จัดการผู้ใช้/แผนก |
| SUPER_ADMIN | ทุกอย่าง + ตั้งค่า LINE/DB/Plan |

### Ticket (ตั๋วงาน)
| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| tenantId | String (FK → Tenant) | องค์กร |
| ticketNo | Int | หมายเลข Ticket (auto increment ต่อ tenant) |
| title | String | หัวข้อปัญหา |
| description | String | รายละเอียด |
| status | Enum | สถานะ (ดูตารางด้านล่าง) |
| priority | Enum | ลำดับความสำคัญ |
| categoryId | String? (FK → Category) | หมวดหมู่ |
| departmentId | String? (FK → Department) | แผนกที่รับผิดชอบ |
| createdById | String (FK → User) | ผู้แจ้ง |
| assignedToId | String? (FK → User) | ผู้รับผิดชอบ |
| resolvedAt | DateTime? | วันที่แก้ไขเสร็จ |

### Status Flow (การไหลของสถานะ)
```
OPEN → IN_PROGRESS → PENDING → RESOLVED → CLOSED
  ↑        ↓             ↓         ↑
  └────────┘             └─────────┘
```

| Status | Label (ไทย) | ความหมาย |
|--------|-------------|----------|
| OPEN | เปิด | เพิ่งสร้าง ยังไม่มีคนรับ |
| IN_PROGRESS | กำลังดำเนินการ | IT กำลังแก้ไข |
| PENDING | รอข้อมูล | รอข้อมูลเพิ่มเติมจากผู้แจ้ง |
| RESOLVED | แก้ไขแล้ว | แก้ไขเสร็จรอยืนยัน |
| CLOSED | ปิด | จบแล้ว |

### Priority (ลำดับความสำคัญ)
| Priority | Label (ไทย) |
|----------|-------------|
| LOW | ต่ำ |
| MEDIUM | ปานกลาง |
| HIGH | สูง |
| URGENT | ด่วนมาก |

### TicketComment (ความคิดเห็น)
| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| ticketId | String (FK → Ticket) | Ticket ที่ comment |
| userId | String (FK → User) | ผู้ comment |
| message | String | ข้อความ |

### Category (หมวดหมู่)
| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| tenantId | String (FK → Tenant) | องค์กร |
| departmentId | String? (FK → Department) | แผนก (optional) |
| name | String | ชื่อหมวดหมู่ |

### AuditLog (บันทึกประวัติ)
| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| tenantId | String (FK → Tenant) | องค์กร |
| ticketId | String? (FK → Ticket) | Ticket ที่เกี่ยวข้อง |
| userId | String (FK → User) | ผู้กระทำ |
| action | String | เช่น CREATED, UPDATED, COMMENTED, ASSIGNED |
| detail | String? | รายละเอียดเพิ่มเติม |

### MigrationLog (ประวัติย้ายข้อมูล)
| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| tenantId | String (unique, FK → Tenant) | องค์กร |
| status | String | in_progress, completed, failed |
| startedAt | DateTime | เวลาเริ่ม |
| completedAt | DateTime? | เวลาเสร็จ |
| error | String? | ข้อผิดพลาด |

### PlatformAdmin (ผู้ดูแลแพลตฟอร์ม)
| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| email | String (unique) | อีเมล |
| password | String | รหัสผ่าน (bcrypt hash) |

---

## Bot Keyword Commands

### ใน User Chat (ไม่ต้องพิมพ์ trigger word)
| คำสั่ง | Action | ตัวอย่าง |
|--------|--------|---------|
| แจ้งปัญหา [รายละเอียด] | CREATE_TICKET | แจ้งปัญหา อินเตอร์เน็ตช้า |
| ดูตั๋ว / ตั๋วของฉัน | LIST_TICKETS | ดูตั๋ว |
| สถานะ #[หมายเลข] | CHECK_STATUS | สถานะ #1 |
| ถาม [คำถาม] | GEMINI_QUERY (PRO+) | ถาม เดือนนี้มี ticket กี่ใบ |
| ช่วย / help | SHOW_MENU | ช่วย |

### ใน Group Chat (ต้องพิมพ์ trigger word ก่อน)
Trigger words: `นาโน`, `@นาโน`, `nano`, `@nano`

ตัวอย่าง: `นาโน แจ้งปัญหา อินเตอร์เน็ตช้า`

---

## Plan Limits

| Resource | TRIAL | STARTER | PRO | ENTERPRISE |
|----------|-------|---------|-----|------------|
| ผู้ใช้ | 10 | 20 | ∞ | ∞ |
| Ticket/เดือน | 100 | 500 | ∞ | ∞ |
| แผนก | 2 | 5 | ∞ | ∞ |
| AI Bot | ❌ | ❌ | ✅ | ✅ |
| Dedicated DB | ❌ | ❌ | ❌ | ✅ |
