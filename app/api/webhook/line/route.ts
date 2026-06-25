// ─── น้องนาโน — LINE Webhook ─────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateLineSignature, replyMessage, getLineGroupSummary, getLineProfile, getLineGroupMemberProfile } from "@/lib/line";
import { parseNanoCommand } from "@/lib/nano-router";
import { queryDatabase } from "@/lib/gemini";
import {
  menuFlex,
  groupMenuFlex,
  ticketCreatedFlex,
  ticketListFlex,
  ticketStatusFlex,
  welcomeFlex,
  upgradeRequiredFlex,
  systemSelectFlex,
  followTicketFlex,
  groupSummaryFlex,
  toCarouselFlex,
} from "@/lib/nano-reply";

/**
 * Helper to parse Thai and relative due dates from text
 */
function parseDueDate(text: string): Date | null {
  const now = new Date();
  const lowerText = text.toLowerCase().trim();

  // 1. วันนี้ (Today) -> end of day today (23:59:59)
  if (lowerText.includes("วันนี้") || lowerText.includes("ภายในวันนี้")) {
    const d = new Date(now);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  // 2. พรุ่งนี้ (Tomorrow) -> tomorrow (23:59:59)
  if (lowerText.includes("พรุ่งนี้") || lowerText.includes("ภายในพรุ่งนี้")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  // 3. มะรืน (Day after tomorrow) -> day after tomorrow
  if (lowerText.includes("มะรืน") || lowerText.includes("มะรืนนี้")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  // 4. อาทิตย์หน้า / สัปดาห์หน้า (Next week) -> +7 days
  if (lowerText.includes("อาทิตย์หน้า") || lowerText.includes("สัปดาห์หน้า")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  // 5. สิ้นเดือน (End of month)
  if (lowerText.includes("สิ้นเดือน") || lowerText.includes("สิ้นเดือนนี้")) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
    d.setHours(23, 59, 59, 999);
    return d;
  }

  // 6. ภายใน X วัน / X วัน / ใน X วัน (Within X days) -> e.g. "เสร็จใน 3 วัน", "3 วัน"
  const daysMatch = lowerText.match(/(?:ภายใน|อีก|ใน)?\s*(\d+)\s*วัน/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    if (!isNaN(days)) {
      const d = new Date(now);
      d.setDate(d.getDate() + days);
      d.setHours(23, 59, 59, 999);
      return d;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-line-signature");

    // ดึง tenant จาก header → query param → hostname → default
    const hostname = request.headers.get("host") || "";
    const subdomain = hostname.split(".")[0]; // เช่น "icare" จาก "icare.technomand-ai.cloud"
    const isMainDomain = hostname === "nano.technomand-ai.cloud" || hostname.startsWith("localhost");

    const tenantSlug =
      request.headers.get("x-tenant-slug") ||
      request.nextUrl.searchParams.get("tenant") ||
      (!isMainDomain && subdomain !== "nano" ? subdomain : null) ||
      process.env.DEV_TENANT_SLUG ||   // fallback: tenant default จาก env
      "demo";

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant || !tenant.isActive || !tenant.lineOaToken || !tenant.lineOaSecret) {
      return NextResponse.json({ status: "ok" }); // ไม่ทำอะไร
    }

    // ดึง bot config สำหรับ flex messages
    const botConfigRow = await prisma.botConfig.findUnique({ where: { tenantId: tenant.id } });
    const botMeta = {
      botName: botConfigRow?.botName,
      botPersona: botConfigRow?.botPersona,
      themeColor: botConfigRow?.themeColor || tenant.themeColor,
    };
    const welcomeMsg = botConfigRow?.welcomeMessage;
    const menuMsg = botConfigRow?.menuMessage;

    // Helper: reply and log to database
    const replyAndLog = async (
      oaToken: string,
      replyToken: string,
      messages: any[],
      lineUid: string,
      lineGroupId: string | null,
      replyAction?: string
    ) => {
      // 1. ส่ง reply ไป LINE
      await replyMessage(oaToken, replyToken, messages);

      // 2. บันทึก ChatLog (OUTGOING)
      for (const msg of messages) {
        let textContent = "";
        if (msg.type === "text") {
          textContent = msg.text || "";
        } else if (msg.type === "flex") {
          textContent = `[Flex Message] ${msg.altText || ""}`;
        }

        await prisma.chatLog.create({
          data: {
            tenantId: tenant.id,
            lineUid,
            displayName: botMeta.botName || "น้องนาโน",
            lineGroupId,
            messageText: textContent,
            direction: "OUTGOING",
            replyAction: replyAction || "REPLY",
          },
        }).catch((err) => {
          console.error("Failed to write OUTGOING chat log:", err);
        });
      }
    };

    // ตรวจสอบ signature
    if (signature && !validateLineSignature(body, signature, tenant.lineOaSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const webhookBody = JSON.parse(body);
    const events = webhookBody.events || [];

    for (const event of events) {
      if (event.type === "follow") {
        // ผู้ใช้เพิ่มเพื่อน
        const followUid = event.source.userId || "";
        const followGroupId = event.source.groupId || null;

        // สร้างผู้ใช้ในระบบโดยอัตโนมัติเมื่อกดเพิ่มเพื่อน
        if (followUid) {
          try {
            const existingUser = await prisma.user.findUnique({
              where: {
                tenantId_lineUid: {
                  tenantId: tenant.id,
                  lineUid: followUid,
                },
              },
            });

            if (!existingUser) {
              let displayName = "ผู้ใช้งานใหม่";
              let pictureUrl: string | null = null;
              try {
                const profile = await getLineProfile(tenant.lineOaToken!, followUid);
                displayName = profile.displayName;
                pictureUrl = profile.pictureUrl || null;
              } catch (err) {
                console.error("Failed to fetch LINE profile for follow event:", err);
              }

              await prisma.user.create({
                data: {
                  tenantId: tenant.id,
                  lineUid: followUid,
                  displayName,
                  pictureUrl,
                  role: "USER",
                },
              });
            }
          } catch (err) {
            console.error("Failed to auto-create user on follow:", err);
          }
        }

        await replyAndLog(
          tenant.lineOaToken,
          event.replyToken,
          [welcomeFlex(followUid || "ผู้ใช้", tenant.name, botMeta, welcomeMsg) as never],
          followUid,
          followGroupId,
          "WELCOME"
        );
        continue;
      }

      if (event.type !== "message" || event.message.type !== "text") continue;

      const sourceType = event.source.type as "user" | "group" | "room";
      const messageText = event.message.text;
      const lineUid = event.source.userId || "";
      const lineGroupId = event.source.groupId || null;

      // วิเคราะห์คำสั่ง
      const action = parseNanoCommand(messageText, sourceType, tenant.plan);

      // ดึง user หรือสร้างใหม่เมื่อทักเข้ามาเป็นครั้งแรก
      let user = await prisma.user.findFirst({
        where: { tenantId: tenant.id, lineUid },
      });

      if (!user && lineUid) {
        try {
          let displayName = "ผู้ใช้งานใหม่";
          let pictureUrl: string | null = null;
          try {
            if (sourceType !== "user" && lineGroupId) {
              const profile = await getLineGroupMemberProfile(tenant.lineOaToken!, lineGroupId, lineUid);
              displayName = profile.displayName;
              pictureUrl = profile.pictureUrl || null;
            } else {
              const profile = await getLineProfile(tenant.lineOaToken!, lineUid);
              displayName = profile.displayName;
              pictureUrl = profile.pictureUrl || null;
            }
          } catch (err) {
            console.error("Failed to fetch LINE profile for auto-create user:", err);
          }

          user = await prisma.user.create({
            data: {
              tenantId: tenant.id,
              lineUid,
              displayName,
              pictureUrl,
              role: "USER",
            },
          });
        } catch (err) {
          console.error("Failed to auto-create user on message:", err);
        }
      }

      // ─── ตรวจสอบและสร้าง GroupConfig อัตโนมัติ ────────────────
      if (lineGroupId) {
        try {
          const existingGroup = await prisma.groupConfig.findUnique({
            where: {
              tenantId_lineGroupId: {
                tenantId: tenant.id,
                lineGroupId: lineGroupId,
              },
            },
          });

          if (!existingGroup) {
            let groupName = `กลุ่มไลน์ (${lineGroupId.substring(0, 6)})`;
            try {
              const summary = await getLineGroupSummary(tenant.lineOaToken!, lineGroupId);
              if (summary && summary.groupName) {
                groupName = summary.groupName;
              }
            } catch (err) {
              console.error("Failed to fetch line group summary:", err);
            }

            await prisma.groupConfig.create({
              data: {
                tenantId: tenant.id,
                lineGroupId: lineGroupId,
                name: groupName,
                isActive: true,
                autoJoined: true,
              },
            });
          }
        } catch (err) {
          console.error("Failed to auto-create group config:", err);
        }
      }

      // ─── ดึงชื่อโปรไฟล์กรณีที่ user ไม่มีอยู่ในระบบ หรือไม่มีชื่อ ────────
      let displayName = user?.displayName || null;
      if (!displayName && lineUid) {
        try {
          if (sourceType !== "user" && lineGroupId) {
            const profile = await getLineGroupMemberProfile(tenant.lineOaToken!, lineGroupId, lineUid);
            displayName = profile.displayName;
          } else {
            const profile = await getLineProfile(tenant.lineOaToken!, lineUid);
            displayName = profile.displayName;
          }
        } catch (err) {
          console.error("Failed to fetch LINE profile for log:", err);
        }
      }

      // ─── บันทึก ChatLog (INCOMING) ──────────────────────────
      await prisma.chatLog.create({
        data: {
          tenantId: tenant.id,
          lineUid,
          displayName,
          lineGroupId,
          messageText,
          direction: "INCOMING",
          replyAction: action?.action || null,
        },
      }).catch((err) => {
        console.error("Failed to save INCOMING chat log:", err);
      });

      // หากไม่ใช่คำสั่งบอท ให้ข้ามขั้นตอนการทำคำสั่งไปเงียบๆ
      if (!action) continue;

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nano.technomand-ai.cloud';

      // Helper: wrapper to reply using context variables
      const reply = async (messages: any[], oaToken = tenant.lineOaToken!) => {
        if (messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          try {
            const { getQuickReply } = await import("@/lib/nano-reply");
            lastMsg.quickReply = getQuickReply(sourceType);
          } catch (err) {
            console.error("Failed to append quickReply:", err);
          }
        }
        await replyAndLog(oaToken, event.replyToken, messages, lineUid, lineGroupId, action?.action || "REPLY");
      };

      // ─── Resolve System ───────────────────────────────────
      // 1. ถ้ามี systemCode จากข้อความ → ใช้เลย
      // 2. ถ้ามาจาก Group ที่ผูก 1 system → ใช้อัตโนมัติ
      // 3. ถ้าไม่รู้ → ถามด้วย Flex Message
      const resolveSystem = async (systemCode?: string) => {
        if (systemCode) {
          return prisma.system.findFirst({
            where: { tenantId: tenant!.id, code: systemCode, isActive: true },
          });
        }

        if (lineGroupId) {
          const groupConfig = await prisma.groupConfig.findFirst({
            where: { tenantId: tenant!.id, lineGroupId, isActive: true },
            include: {
              groupSystems: {
                include: { system: true },
              },
            },
          });

          if (groupConfig) {
            const activeSystems = groupConfig.groupSystems
              .filter((gs) => gs.system.isActive)
              .map((gs) => gs.system);

            if (activeSystems.length === 1) {
              return activeSystems[0];
            }
          }
        }

        // ค้นหาระบบเริ่มต้นหลักของ Tenant (ถ้ามีกำหนดไว้)
        const defaultSystem = await prisma.system.findFirst({
          where: { tenantId: tenant!.id, isDefault: true, isActive: true },
        });
        if (defaultSystem) {
          return defaultSystem;
        }

        return null;
      };

      // ดึง systems ของ tenant (สำหรับ Flex Message เลือกระบบ)
      const getTenantSystems = async () => {
        return prisma.system.findMany({
          where: { tenantId: tenant!.id, isActive: true },
          orderBy: { name: "asc" },
        });
      };

      // ใช้ OA ของ System ถ้ามี, ถ้าไม่มี fallback ไปใช้ของ Tenant
      const getOaToken = (system?: { lineOaToken: string | null } | null) => {
        if (system?.lineOaToken) return system.lineOaToken;
        return tenant!.lineOaToken!;
      };

      switch (action.action) {
        case "REGISTER": {
          let targetUser = await prisma.user.findFirst({
            where: { tenantId: tenant.id, lineUid },
          });

          let matchedDeptId: string | null = null;
          let matchedDeptName = "";
          if (action.departmentName) {
            const dept = await prisma.department.findFirst({
              where: {
                tenantId: tenant.id,
                name: {
                  equals: action.departmentName.trim(),
                  mode: "insensitive",
                },
                isActive: true,
              },
            });
            if (dept) {
              matchedDeptId = dept.id;
              matchedDeptName = dept.name;
            }
          }

          if (!targetUser) {
            let pictureUrl: string | null = null;
            let finalName = action.name;
            try {
              if (sourceType !== "user" && lineGroupId) {
                const profile = await getLineGroupMemberProfile(tenant.lineOaToken!, lineGroupId, lineUid);
                pictureUrl = profile.pictureUrl || null;
                if (!finalName) finalName = profile.displayName;
              } else {
                const profile = await getLineProfile(tenant.lineOaToken!, lineUid);
                pictureUrl = profile.pictureUrl || null;
                if (!finalName) finalName = profile.displayName;
              }
            } catch (err) {
              console.error("Failed to get line profile in REGISTER:", err);
            }

            targetUser = await prisma.user.create({
              data: {
                tenantId: tenant.id,
                lineUid,
                displayName: finalName || "ผู้ใช้งานใหม่",
                pictureUrl,
                employeeCode: action.employeeCode || null,
                departmentId: matchedDeptId,
                role: "USER",
              },
            });
          } else {
            const updateData: Record<string, any> = {};
            if (action.employeeCode) updateData.employeeCode = action.employeeCode;
            if (action.name) updateData.displayName = action.name;
            if (matchedDeptId) updateData.departmentId = matchedDeptId;

            targetUser = await prisma.user.update({
              where: { id: targetUser.id },
              data: updateData,
            });
          }

          let replyText = "";
          if (action.employeeCode && action.name) {
            replyText = `ลงทะเบียน รหัสพนักงาน: ${action.employeeCode} ชื่อ: ${action.name} สำเร็จแล้วค่ะ 🎉`;
          } else if (action.employeeCode) {
            replyText = `ลงทะเบียนรหัสพนักงาน: ${action.employeeCode} สำเร็จแล้วค่ะ 🎉 (คุณยังไม่ได้ระบุชื่อ)`;
          } else if (action.name) {
            replyText = `ลงทะเบียนชื่อ: ${action.name} สำเร็จแล้วค่ะ 🎉 (คุณยังไม่ได้ระบุรหัสพนักงาน)`;
          } else {
            if (targetUser.employeeCode || targetUser.departmentId) {
              replyText = `สวัสดีค่ะ นี่คือข้อมูลโปรไฟล์ปัจจุบันของคุณ คุณสามารถแก้ไขข้อมูลได้โดยกดปุ่มแก้ไขโปรไฟล์ด้านล่างนี้ได้เลยค่ะ 😊`;
            } else {
              replyText = `สวัสดีค่ะ คุณสามารถลงทะเบียนได้โดยพิมพ์ "ลงทะเบียน รหัสพนักงาน [รหัส] ชื่อ [ชื่อ] แผนก [แผนก]" หรือกดแก้ไขโปรไฟล์จากปุ่มด้านล่างนี้ได้เลยค่ะ 😊`;
            }
          }

          if (action.departmentName) {
            if (matchedDeptId) {
              replyText += `\n🏢 สังกัดแผนก: ${matchedDeptName} เรียบร้อยค่ะ`;
            } else {
              replyText += `\n⚠️ ไม่พบแผนก "${action.departmentName}" ในระบบ (คุณสามารถแก้ไขแผนกได้ที่หน้าโปรไฟล์ค่ะ)`;
            }
          }

          let displayDeptName = "ยังไม่ระบุแผนก";
          if (targetUser.departmentId) {
            const dept = await prisma.department.findUnique({
              where: { id: targetUser.departmentId },
              select: { name: true },
            });
            if (dept) displayDeptName = dept.name;
          }

          const redirectPath = `/profile`;
          const profileUrl = `${appUrl}/login?redirect=${encodeURIComponent(redirectPath)}&tenant=${tenant.slug}`;

          const { profileCardFlex } = await import("@/lib/nano-reply");
          
          if (sourceType === "user") {
            await reply([
              { type: "text", text: replyText } as never,
              profileCardFlex(
                {
                  displayName: targetUser.displayName,
                  employeeCode: targetUser.employeeCode,
                  departmentName: displayDeptName,
                },
                profileUrl,
                botMeta
              ) as never,
            ]);
          } else {
            // In group/room: only send text reply, do not expose profile card
            await reply([
              { 
                type: "text", 
                text: `${replyText}\n\n🔒 เพื่อความเป็นส่วนตัวสูงสุด คุณสามารถคลิกลิงก์ด้านล่าง หรือ พิมพ์คำสั่ง "โปรไฟล์" ในแชทส่วนตัวกับบอท เพื่อตรวจสอบและแก้ไขบัตรข้อมูลพนักงานของคุณได้เลยนะคะ 😊\n🔗 แก้ไขโปรไฟล์: ${profileUrl}` 
              } as never,
            ]);
          }
          break;
        }

        case "SHOW_DASHBOARD": {
          if (!user) {
            await reply([
              { type: "text", text: "กรุณาลงทะเบียนผ่าน LIFF ก่อนค่ะ" } as never,
            ]);
            break;
          }

          let redirectPath = "/ticket";
          if (user.role === "IT") {
            redirectPath = "/it";
          } else if (user.role === "DEPT_ADMIN") {
            redirectPath = "/dept";
          } else if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
            redirectPath = "/admin";
          }

          const dashboardUrl = `${appUrl}/login?redirect=${encodeURIComponent(redirectPath)}&tenant=${tenant.slug}`;
          const { linkCardFlex } = await import("@/lib/nano-reply");

          if (sourceType === "user") {
            await reply([
              linkCardFlex(
                "📊 แดชบอร์ดของคุณ",
                `สวัสดีค่ะ คุณ ${user.displayName} คุณสามารถกดปุ่มด้านล่างนี้เพื่อเข้าสู่หน้าแดชบอร์ดส่วนตัวของคุณในระบบได้เลยค่ะ 😊`,
                "เข้าสู่ Dashboard",
                dashboardUrl,
                botMeta
              ) as never,
            ]);
          } else {
            // Group chat: only send text reply, do not expose name card
            await reply([
              {
                type: "text",
                text: `🔒 เพื่อความเป็นส่วนตัวสูงสุดและสิทธิ์การเข้าถึงข้อมูล กรุณาเข้าสู่ระบบผ่านลิงก์ด้านล่าง เพื่อเข้าสู่แดชบอร์ดส่วนตัวของคุณค่ะ 😊\n🔗 เข้าสู่ Dashboard: ${dashboardUrl}`,
              } as never,
            ]);
          }
          break;
        }

        case "SHOW_CREATE_TICKET_LINK": {
          if (!user) {
            await reply([
              { type: "text", text: "กรุณาลงทะเบียนผ่าน LIFF ก่อนค่ะ" } as never,
            ]);
            break;
          }

          const createTicketUrl = `${appUrl}/login?redirect=${encodeURIComponent("/ticket/new")}&tenant=${tenant.slug}`;
          const { linkCardFlex } = await import("@/lib/nano-reply");

          if (sourceType === "user") {
            await reply([
              linkCardFlex(
                "📝 เปิด Ticket เอง",
                `สวัสดีค่ะ คุณ ${user.displayName} คุณสามารถกดปุ่มด้านล่างนี้เพื่อเข้าสู่หน้าสร้าง Ticket ใหม่ได้ทันทีค่ะ 😊`,
                "สร้าง Ticket ใหม่",
                createTicketUrl,
                botMeta
              ) as never,
            ]);
          } else {
            // Group chat
            await reply([
              {
                type: "text",
                text: `🔒 เพื่อความปลอดภัย กรุณาคลิกลิงก์ด้านล่างเพื่อเข้าสู่ระบบและสร้าง Ticket ในระบบด้วยตัวเองได้เลยค่ะ 😊\n🔗 เปิด Ticket ในระบบ: ${createTicketUrl}`,
              } as never,
            ]);
          }
          break;
        }

        case "GREETING": {
          const name = botMeta.botName || "น้องนาโน";
          await reply([
            {
              type: "text",
              text: `สวัสดีค่ะ 👋 ยินดีให้บริการ\n\n${name} พร้อมช่วยแจ้งปัญหา ดูสถานะ ticket หรือถามข้อมูลต่างๆ\n\nพิมพ์ "เมนู" เพื่อดูคำสั่งทั้งหมดค่ะ`,
            } as never,
          ]);
          break;
        }

        case "SHOW_SYSTEMS": {
          const systems = await getTenantSystems();
          if (systems.length === 0) {
            await reply([
              { type: "text", text: "ยังไม่มีระบบที่ตั้งค่าไว้ค่ะ กรุณาติดต่อผู้ดูแลระบบ" } as never,
            ]);
          } else {
            const prefix = sourceType !== "user" ? "nano แจ้ง" : "แจ้ง";
            await reply([
              systemSelectFlex(
                systems.map((s) => ({ id: s.id, code: s.code, name: s.name, icon: s.icon, color: s.color })),
                prefix,
                botMeta
              ) as never,
            ]);
          }
          break;
        }

        case "SHOW_MENU": {
          const systems = await getTenantSystems();
          let systemsCard: any = null;

          if (systems.length > 0) {
            const prefix = sourceType !== "user" ? "นาโน แจ้ง" : "แจ้ง";
            systemsCard = systemSelectFlex(
              systems.map((s) => ({ id: s.id, code: s.code, name: s.name, icon: s.icon, color: s.color })),
              prefix,
              botMeta
            );
          }

          if (sourceType !== "user") {
            let systemName: string | undefined;
            if (lineGroupId) {
              const groupConfig = await prisma.groupConfig.findFirst({
                where: { tenantId: tenant.id, lineGroupId, isActive: true },
                include: {
                  groupSystems: {
                    include: { system: true },
                  },
                },
              });
              if (groupConfig) {
                const activeSystems = groupConfig.groupSystems
                  .filter((gs) => gs.system.isActive)
                  .map((gs) => gs.system);
                if (activeSystems.length === 1) {
                  systemName = activeSystems[0].name;
                }
              }
            }
            const guideCard = groupMenuFlex(tenant.plan, systemName, botMeta);
            await reply(
              systemsCard 
                ? [toCarouselFlex([guideCard, systemsCard], "เมนูหลัก") as never] 
                : [guideCard as never]
            );
          } else {
            const guideCard = menuFlex(tenant.plan, botMeta, menuMsg);
            await reply(
              systemsCard 
                ? [toCarouselFlex([guideCard, systemsCard], "เมนูหลัก") as never] 
                : [guideCard as never]
            );
          }
          break;
        }

        case "CREATE_TICKET": {
          if (!user) {
            await reply([
              { type: "text", text: "กรุณาลงทะเบียนผ่าน LIFF ก่อนค่ะ" } as never,
            ]);
            break;
          }

          if (!action.text) {
            const sysCode = action.systemCode ? action.systemCode.toLowerCase() : "ชื่อระบบ";
            await reply([
              {
                type: "text",
                text: `กรุณาพิมพ์ "แจ้ง [${sysCode}] [รายละเอียดปัญหา]" ค่ะ\nตัวอย่าง: แจ้ง [${sysCode}] ระบบใช้งานไม่ได้`,
              } as never,
            ]);
            break;
          }

          const system = await resolveSystem(action.systemCode);

          if (!system) {
            const systems = await getTenantSystems();
            if (systems.length === 0) {
              await reply([
                { type: "text", text: "ยังไม่มีระบบในองค์กร กรุณาติดต่อ Admin ค่ะ" } as never,
              ]);
            } else {
              const prefix = sourceType !== "user" ? "nano แจ้ง" : "แจ้ง";
              await reply([
                systemSelectFlex(
                  systems.map((s) => ({ id: s.id, code: s.code, name: s.name, icon: s.icon, color: s.color })),
                  prefix,
                  botMeta,
                  action.text
                ) as never,
              ]);
            }
            break;
          }

          // ค้นหาผู้รับผิดชอบเมื่อถูก Tag นำหน้า (เช่น bug @ChinJunG ...)
          let assignedToId = system.defaultAssigneeId;
          if ('assigneeName' in action && action.assigneeName) {
            const assignedUser = await prisma.user.findFirst({
              where: {
                tenantId: tenant.id,
                displayName: {
                  contains: action.assigneeName,
                  mode: "insensitive",
                },
                isActive: true,
              },
            });
            if (assignedUser) {
              assignedToId = assignedUser.id;
            }
          }

          // วิเคราะห์ Due Date จากเนื้อหาข้อความ
          const dueDate = parseDueDate(action.text);

          const lastTicket = await prisma.ticket.findFirst({
            where: { tenantId: tenant.id, systemId: system.id },
            orderBy: { ticketNo: "desc" },
          });
          const nextNo = (lastTicket?.ticketNo || 0) + 1;

          const ticket = await prisma.ticket.create({
            data: {
              tenantId: tenant.id,
              ticketNo: nextNo,
              title: action.text.substring(0, 100),
              description: action.text,
              createdById: user.id,
              departmentId: user.departmentId,
              systemId: system.id,
              assignedToId,
              ticketType: action.ticketType || "BUG",
              dueDate,
            },
            include: {
              department: { select: { name: true } },
              system: { select: { name: true, icon: true, ticketPrefix: true } },
              assignedTo: { select: { displayName: true } },
            },
          });

          await prisma.auditLog.create({
            data: {
              tenantId: tenant.id,
              ticketId: ticket.id,
              userId: user.id,
              action: "CREATED",
              detail: `สร้าง Ticket ${system.ticketPrefix}-${ticket.ticketNo}: ${ticket.title}`,
            },
          });

          const oaToken = getOaToken(system);
          await reply([
            ticketCreatedFlex(
              {
                ticketNo: ticket.ticketNo,
                title: ticket.title,
                status: ticket.status,
                priority: ticket.priority,
                ticketType: ticket.ticketType,
                departmentName: ticket.department?.name,
                systemName: ticket.system?.name,
                systemIcon: ticket.system?.icon || undefined,
                systemPrefix: ticket.system?.ticketPrefix,
                createdAt: ticket.createdAt.toLocaleDateString("th-TH"),
                assignedToName: ticket.assignedTo?.displayName || undefined,
                dueDate: ticket.dueDate ? ticket.dueDate.toLocaleDateString("th-TH") : undefined,
              },
              `${appUrl}/ticket/${ticket.id}`,
              botMeta
            ) as never,
          ], oaToken);
          break;
        }

        case "ASSIGN_NOTE": {
          if (!user) {
            await reply([
              { type: "text", text: "กรุณาลงทะเบียนผ่าน LIFF ก่อนค่ะ" } as never,
            ]);
            break;
          }

          const system = await resolveSystem(action.systemCode);
          if (!system) {
            const systems = await getTenantSystems();
            if (systems.length === 0) {
              await reply([
                { type: "text", text: "ยังไม่มีระบบในองค์กร กรุณาติดต่อ Admin ค่ะ" } as never,
              ]);
            } else {
              const prefix = sourceType !== "user"
                ? `nano note @${action.assigneeName}`
                : `note @${action.assigneeName}`;
              await reply([
                systemSelectFlex(
                  systems.map((s) => ({ id: s.id, code: s.code, name: s.name, icon: s.icon, color: s.color })),
                  prefix,
                  botMeta,
                  action.text
                ) as never,
              ]);
            }
            break;
          }

          // ค้นหาผู้รับผิดชอบตาม displayName
          const assignedUser = await prisma.user.findFirst({
            where: {
              tenantId: tenant.id,
              displayName: {
                contains: action.assigneeName,
                mode: "insensitive",
              },
              isActive: true,
            },
          });

          // วิเคราะห์ Due Date
          const dueDate = parseDueDate(action.text);

          const lastTicket = await prisma.ticket.findFirst({
            where: { tenantId: tenant.id, systemId: system.id },
            orderBy: { ticketNo: "desc" },
          });
          const nextNo = (lastTicket?.ticketNo || 0) + 1;

          const ticket = await prisma.ticket.create({
            data: {
              tenantId: tenant.id,
              ticketNo: nextNo,
              title: action.text.substring(0, 100),
              description: action.text,
              createdById: user.id,
              departmentId: user.departmentId,
              systemId: system.id,
              assignedToId: assignedUser?.id || system.defaultAssigneeId,
              dueDate: dueDate,
            },
            include: {
              department: { select: { name: true } },
              system: { select: { name: true, icon: true, ticketPrefix: true } },
              assignedTo: { select: { displayName: true } },
            },
          });

          await prisma.auditLog.create({
            data: {
              tenantId: tenant.id,
              ticketId: ticket.id,
              userId: user.id,
              action: "CREATED",
              detail: `สร้าง Ticket ${system.ticketPrefix}-${ticket.ticketNo} จาก note assign ให้ ${ticket.assignedTo?.displayName || "Default"} dueDate ${dueDate?.toLocaleDateString("th-TH") || "none"}`,
            },
          });

          const ticketRef = system.ticketPrefix ? `#${system.ticketPrefix}-${ticket.ticketNo}` : `#${ticket.ticketNo}`;
          let replyText = `✅ บันทึกและเปิด Ticket ${ticketRef} เรียบร้อยค่ะ`;
          if (assignedUser) {
            replyText += `\n👤 ผู้รับผิดชอบ: ${assignedUser.displayName}`;
          } else {
            replyText += `\n⚠️ ไม่พบผู้รับผิดชอบชื่อ @${action.assigneeName} (มอบหมายให้ผู้ดูแลระบบแทน)`;
          }
          if (dueDate) {
            replyText += `\n📅 กำหนดเสร็จ: ${dueDate.toLocaleDateString("th-TH")}`;
          }

          const oaToken = getOaToken(system);
          await reply([
            { type: "text", text: replyText } as never,
            ticketCreatedFlex(
              {
                ticketNo: ticket.ticketNo,
                title: ticket.title,
                status: ticket.status,
                priority: ticket.priority,
                ticketType: ticket.ticketType,
                departmentName: ticket.department?.name,
                systemName: ticket.system?.name,
                systemIcon: ticket.system?.icon || undefined,
                systemPrefix: ticket.system?.ticketPrefix,
                createdAt: ticket.createdAt.toLocaleDateString("th-TH"),
              },
              `${appUrl}/ticket/${ticket.id}`,
              botMeta
            ) as never,
          ], oaToken);
          break;
        }

        case "LIST_TICKETS": {
          if (!user) break;

          const listSystem = action.systemCode
            ? await resolveSystem(action.systemCode)
            : null;

          const ticketWhere: Record<string, any> = {
            tenantId: tenant.id,
          };

          // Role-based logic
          if (user.role === "USER") {
            ticketWhere.createdById = user.id;
          } else if (user.role === "IT") {
            ticketWhere.OR = [
              { createdById: user.id },
              { assignedToId: user.id },
              ...(user.departmentId ? [{ departmentId: user.departmentId, assignedToId: null }] : []),
            ];
          } else if (user.role === "DEPT_ADMIN" && user.departmentId) {
            ticketWhere.departmentId = user.departmentId;
          }

          if (listSystem) ticketWhere.systemId = listSystem.id;

          const tickets = await prisma.ticket.findMany({
            where: ticketWhere,
            include: {
              department: { select: { name: true } },
              system: { select: { name: true, icon: true, ticketPrefix: true } },
              createdBy: { select: { displayName: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          });

          let redirectPath = "/ticket";
          if (user.role === "IT") {
            redirectPath = "/it";
          } else if (user.role === "DEPT_ADMIN") {
            redirectPath = "/dept";
          }
          const allTicketsUrl = `${appUrl}/login?redirect=${encodeURIComponent(redirectPath)}&tenant=${tenant.slug}`;

          await reply([
            ticketListFlex(
              tickets.map((t) => ({
                ticketNo: t.ticketNo,
                title: t.title,
                status: t.status,
                priority: t.priority,
                ticketType: t.ticketType,
                departmentName: t.department?.name,
                createdByName: t.createdBy?.displayName,
                systemName: t.system?.name,
                systemIcon: t.system?.icon || undefined,
                systemPrefix: t.system?.ticketPrefix,
                createdAt: t.createdAt.toLocaleDateString("th-TH"),
              })),
              appUrl,
              allTicketsUrl,
              botMeta
            ) as never,
          ]);
          break;
        }

        case "CHECK_STATUS": {
          const statusWhere: Record<string, any> = {
            tenantId: tenant.id,
            ticketNo: parseInt(action.ticketNo),
          };

          if (action.systemPrefix) {
            const prefixSystem = await prisma.system.findFirst({
              where: {
                tenantId: tenant.id,
                ticketPrefix: action.systemPrefix,
                isActive: true,
              },
            });
            if (prefixSystem) statusWhere.systemId = prefixSystem.id;
          }

          const foundTicket = await prisma.ticket.findFirst({
            where: statusWhere,
            include: {
              department: { select: { name: true } },
              assignedTo: { select: { displayName: true } },
              system: { select: { name: true, icon: true, ticketPrefix: true } },
            },
          });

          if (!foundTicket) {
            const displayNo = action.systemPrefix
              ? `${action.systemPrefix}-${action.ticketNo}`
              : `#${action.ticketNo}`;
            await reply([
              { type: "text", text: `ไม่พบ Ticket ${displayNo} ค่ะ` } as never,
            ]);
          } else {
            await reply([
              ticketStatusFlex(
                {
                  ticketNo: foundTicket.ticketNo,
                  title: foundTicket.title,
                  status: foundTicket.status,
                  priority: foundTicket.priority,
                  ticketType: foundTicket.ticketType,
                  departmentName: foundTicket.department?.name,
                  assignedToName: foundTicket.assignedTo?.displayName,
                  systemName: foundTicket.system?.name,
                  systemIcon: foundTicket.system?.icon || undefined,
                  systemPrefix: foundTicket.system?.ticketPrefix,
                  createdAt: foundTicket.createdAt.toLocaleDateString("th-TH"),
                },
                botMeta
              ) as never,
            ]);
          }
          break;
        }

        case "CLOSE_TICKET": {
          const closeWhere: Record<string, any> = {
            tenantId: tenant.id,
            ticketNo: parseInt(action.ticketNo),
          };

          if (action.systemPrefix) {
            const prefixSystem = await prisma.system.findFirst({
              where: {
                tenantId: tenant.id,
                ticketPrefix: action.systemPrefix,
                isActive: true,
              },
            });
            if (prefixSystem) closeWhere.systemId = prefixSystem.id;
          }

          const foundTicket = await prisma.ticket.findFirst({
            where: closeWhere,
            include: {
              createdBy: { select: { id: true, displayName: true, lineUid: true } },
              system: { select: { ticketPrefix: true } },
            },
          });

          if (!foundTicket) {
            const displayNo = action.systemPrefix
              ? `${action.systemPrefix}-${action.ticketNo}`
              : `#${action.ticketNo}`;
            await reply([
              { type: "text", text: `ไม่พบ Ticket ${displayNo} ในระบบค่ะ` } as never,
            ]);
            break;
          }

          const isIT = user && (user.role === "IT" || user.role === "ADMIN" || user.role === "SUPER_ADMIN");
          const isCreator = lineUid && lineUid === foundTicket.createdBy.lineUid;

          if (!isIT && !isCreator) {
            await reply([
              { type: "text", text: "ขออภัยค่ะ เฉพาะผู้สร้างตั๋วงานหรือเจ้าหน้าที่ IT เท่านั้นที่สามารถปิดตั๋วงานนี้ได้ค่ะ" } as never,
            ]);
            break;
          }

          const ticketRef = foundTicket.system?.ticketPrefix
            ? `${foundTicket.system.ticketPrefix}-${foundTicket.ticketNo}`
            : `#${foundTicket.ticketNo}`;

          if (foundTicket.status === "CLOSED") {
            await reply([
              { type: "text", text: `ตั๋วงาน #${ticketRef} ได้รับการปิดเรียบร้อยแล้วก่อนหน้านี้ค่ะ` } as never,
            ]);
            break;
          }

          await prisma.ticket.update({
            where: { id: foundTicket.id },
            data: { status: "CLOSED" },
          });

          await prisma.auditLog.create({
            data: {
              tenantId: tenant.id,
              ticketId: foundTicket.id,
              userId: user?.id || foundTicket.createdById,
              action: "UPDATED",
              detail: "เปลี่ยนสถานะเป็น CLOSED ผ่าน LINE Bot (Quick Menu)",
            },
          });

          await reply([
            {
              type: "text",
              text: `🙏 ขอบคุณค่ะ! น้องนาโนได้ทำการปิดตั๋วงาน #${ticketRef} "${foundTicket.title}" ให้เรียบร้อยแล้วค่ะ`,
            } as never,
          ]);
          break;
        }

        case "FOLLOW_TICKET": {
          if (!user) {
            await reply([
              { type: "text", text: "กรุณาลงทะเบียนผ่าน LIFF ก่อนค่ะ" } as never,
            ]);
            break;
          }

          const targetWhere: Record<string, any> = {
            tenantId: tenant.id,
            ticketNo: parseInt(action.ticketNo),
          };

          if (action.systemPrefix) {
            const prefixSystem = await prisma.system.findFirst({
              where: {
                tenantId: tenant.id,
                ticketPrefix: action.systemPrefix,
                isActive: true,
              },
            });
            if (prefixSystem) targetWhere.systemId = prefixSystem.id;
          }

          const targetTicket = await prisma.ticket.findFirst({
            where: targetWhere,
            include: {
              system: { select: { ticketPrefix: true } },
            },
          });

          if (!targetTicket) {
            const displayNo = action.systemPrefix
              ? `${action.systemPrefix}-${action.ticketNo}`
              : `#${action.ticketNo}`;
            await reply([
              { type: "text", text: `ไม่พบ Ticket ${displayNo} ค่ะ` } as never,
            ]);
            break;
          }

          const ticketRef = targetTicket.system?.ticketPrefix
            ? `${targetTicket.system.ticketPrefix}-${targetTicket.ticketNo}`
            : `#${targetTicket.ticketNo}`;

          const existingFollow = await prisma.ticketFollower.findUnique({
            where: {
              ticketId_userId: {
                ticketId: targetTicket.id,
                userId: user.id,
              },
            },
          });

          let isFollowing = false;
          if (existingFollow) {
            await prisma.ticketFollower.delete({
              where: { id: existingFollow.id },
            });
          } else {
            await prisma.ticketFollower.create({
              data: {
                ticketId: targetTicket.id,
                userId: user.id,
              },
            });
            isFollowing = true;
          }

          await reply([followTicketFlex(ticketRef, isFollowing, botMeta) as never]);
          break;
        }

        case "GROUP_SUMMARY": {
          let targetSystemId: string | undefined;
          let systemName: string | undefined;

          if (action.systemCode) {
            const sys = await resolveSystem(action.systemCode);
            if (sys) {
              targetSystemId = sys.id;
              systemName = sys.name;
            }
          } else if (lineGroupId) {
            const groupConfig = await prisma.groupConfig.findFirst({
              where: { tenantId: tenant.id, lineGroupId, isActive: true },
              include: {
                groupSystems: {
                  include: { system: true },
                },
              },
            });
            if (groupConfig) {
              const activeSystems = groupConfig.groupSystems
                .filter((gs) => gs.system.isActive)
                .map((gs) => gs.system);
              if (activeSystems.length === 1) {
                targetSystemId = activeSystems[0].id;
                systemName = activeSystems[0].name;
              }
            }
          }

          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

          const statsWhere: Record<string, any> = {
            tenantId: tenant.id,
            createdAt: {
              gte: startOfMonth,
            },
          };
          if (targetSystemId) {
            statsWhere.systemId = targetSystemId;
          }

          const tickets = await prisma.ticket.findMany({
            where: statsWhere,
            select: { status: true },
          });

          const stats = {
            open: 0,
            inProgress: 0,
            pending: 0,
            resolved: 0,
            closed: 0,
            total: tickets.length,
          };

          tickets.forEach((t) => {
            if (t.status === "OPEN") stats.open++;
            else if (t.status === "IN_PROGRESS") stats.inProgress++;
            else if (t.status === "PENDING") stats.pending++;
            else if (t.status === "RESOLVED") stats.resolved++;
            else if (t.status === "CLOSED") stats.closed++;
          });

          await reply([groupSummaryFlex(stats, systemName, botMeta) as never]);
          break;
        }

        case "GEMINI_QUERY": {
          if (!user) {
            await reply([
              { type: "text", text: "กรุณาลงทะเบียนผ่าน LIFF ก่อนถามข้อมูลค่ะ" } as never,
            ]);
            break;
          }

          const answer = await queryDatabase(action.query, {
            tenantId: tenant.id,
            userId: user.id,
            departmentId: user.departmentId,
            userRole: user.role,
            botName: botMeta.botName,
            botPersona: botMeta.botPersona,
            systemPrompt: botConfigRow?.systemPrompt,
            aiModel: botConfigRow?.aiModel,
            lineUid: lineUid,
            lineGroupId: lineGroupId,
          });

          await reply([{ type: "text", text: answer } as never]);
          break;
        }

        case "UPGRADE_REQUIRED": {
          await reply([upgradeRequiredFlex(tenant.plan, botMeta) as never]);
          break;
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ status: "ok" }); // LINE expects 200
  }
}
