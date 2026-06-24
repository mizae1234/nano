// ─── น้องนาโน — LINE Webhook ─────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateLineSignature, replyMessage } from "@/lib/line";
import { parseNanoCommand } from "@/lib/nano-router";
import {
  menuFlex,
  ticketCreatedFlex,
  ticketListFlex,
  ticketStatusFlex,
  welcomeFlex,
  upgradeRequiredFlex,
  systemSelectFlex,
} from "@/lib/nano-reply";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-line-signature");

    // ดึง tenant จาก subdomain หรือ query param
    const tenantSlug =
      request.headers.get("x-tenant-slug") ||
      request.nextUrl.searchParams.get("tenant");

    if (!tenantSlug) {
      return NextResponse.json({ error: "ไม่พบ tenant" }, { status: 400 });
    }

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

    // ตรวจสอบ signature
    if (signature && !validateLineSignature(body, signature, tenant.lineOaSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const webhookBody = JSON.parse(body);
    const events = webhookBody.events || [];

    for (const event of events) {
      if (event.type === "follow") {
        // ผู้ใช้เพิ่มเพื่อน
        await replyMessage(tenant.lineOaToken, event.replyToken, [
          welcomeFlex(event.source.userId || "ผู้ใช้", tenant.name, botMeta, welcomeMsg) as never,
        ]);
        continue;
      }

      if (event.type !== "message" || event.message.type !== "text") continue;

      const sourceType = event.source.type as "user" | "group" | "room";
      const messageText = event.message.text;
      const lineUid = event.source.userId;
      const lineGroupId = event.source.groupId || null;

      // วิเคราะห์คำสั่ง
      const action = parseNanoCommand(messageText, sourceType, tenant.plan);
      if (!action) continue;

      // ดึง user
      const user = await prisma.user.findFirst({
        where: { tenantId: tenant.id, lineUid },
      });

      const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`;

      // ─── Resolve System ───────────────────────────────────
      // 1. ถ้ามี systemCode จากข้อความ → ใช้เลย
      // 2. ถ้ามาจาก Group ที่ผูก 1 system → ใช้อัตโนมัติ
      // 3. ถ้าไม่รู้ → ถามด้วย Flex Message
      const resolveSystem = async (systemCode?: string) => {
        // ถ้ามี code → หาจาก code
        if (systemCode) {
          return prisma.system.findFirst({
            where: { tenantId: tenant!.id, code: systemCode, isActive: true },
          });
        }

        // ถ้ามาจาก group → ดู GroupConfig
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

            // Group ผูก 1 system → ใช้เลย
            if (activeSystems.length === 1) {
              return activeSystems[0];
            }
          }
        }

        // ไม่รู้ → return null (ต้องถามผู้ใช้)
        return null;
      };

      // ดึง systems ของ tenant (สำหรับ Flex Message เลือกระบบ)
      const getTenantSystems = async () => {
        return prisma.system.findMany({
          where: { tenantId: tenant!.id, isActive: true },
          orderBy: { name: "asc" },
        });
      };

      // ─── Helper: resolve LINE OA token ────────────────────
      // ใช้ OA ของ System ถ้ามี, ถ้าไม่มี fallback ไปใช้ของ Tenant
      const getOaToken = (system?: { lineOaToken: string | null } | null) => {
        if (system?.lineOaToken) return system.lineOaToken;
        return tenant!.lineOaToken!;
      };

      switch (action.action) {
        case "SHOW_MENU":
          await replyMessage(tenant.lineOaToken, event.replyToken, [
            menuFlex(tenant.plan, botMeta, menuMsg) as never,
          ]);
          break;

        case "CREATE_TICKET":
          if (!user) {
            await replyMessage(tenant.lineOaToken, event.replyToken, [
              { type: "text", text: "กรุณาลงทะเบียนผ่าน LIFF ก่อนค่ะ" } as never,
            ]);
            break;
          }

          if (!action.text) {
            await replyMessage(tenant.lineOaToken, event.replyToken, [
              {
                type: "text",
                text: 'กรุณาพิมพ์ "แจ้งปัญหา [ชื่อระบบ] รายละเอียด" ค่ะ\nตัวอย่าง: แจ้งปัญหา [hris] ระบบลาไม่ทำงาน',
              } as never,
            ]);
            break;
          }

          // Resolve system
          const system = await resolveSystem(action.systemCode);

          if (!system) {
            // ไม่รู้ระบบ → ถามด้วย Flex Message
            const systems = await getTenantSystems();
            if (systems.length === 0) {
              await replyMessage(tenant.lineOaToken, event.replyToken, [
                { type: "text", text: "ยังไม่มีระบบในองค์กร กรุณาติดต่อ Admin ค่ะ" } as never,
              ]);
            } else {
              await replyMessage(tenant.lineOaToken, event.replyToken, [
                systemSelectFlex(
                  systems.map((s) => ({ id: s.id, code: s.code, name: s.name, icon: s.icon, color: s.color })),
                  "แจ้ง",
                  botMeta
                ) as never,
              ]);
            }
            break;
          }

          // สร้าง ticket พร้อม system — ticket number per system
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
              assignedToId: system.defaultAssigneeId,
            },
            include: {
              department: { select: { name: true } },
              system: { select: { name: true, icon: true, ticketPrefix: true } },
            },
          });

          // Audit log
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
          await replyMessage(oaToken, event.replyToken, [
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
              `${liffUrl}/ticket/${ticket.id}`,
              botMeta
            ) as never,
          ]);
          break;

        case "LIST_TICKETS":
          if (!user) break;

          // ถ้ามี systemCode → filter ตาม system
          const listSystem = action.systemCode
            ? await resolveSystem(action.systemCode)
            : null;

          const ticketWhere: Record<string, unknown> = {
            tenantId: tenant.id,
            createdById: user.id,
          };
          if (listSystem) ticketWhere.systemId = listSystem.id;

          const tickets = await prisma.ticket.findMany({
            where: ticketWhere,
            include: {
              department: { select: { name: true } },
              system: { select: { name: true, icon: true, ticketPrefix: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          });

          await replyMessage(tenant.lineOaToken, event.replyToken, [
            ticketListFlex(
              tickets.map((t) => ({
                ticketNo: t.ticketNo,
                title: t.title,
                status: t.status,
                priority: t.priority,
                ticketType: t.ticketType,
                departmentName: t.department?.name,
                systemName: t.system?.name,
                systemIcon: t.system?.icon || undefined,
                systemPrefix: t.system?.ticketPrefix,
                createdAt: t.createdAt.toLocaleDateString("th-TH"),
              })),
              liffUrl,
              botMeta
            ) as never,
          ]);
          break;

        case "CHECK_STATUS":
          const statusWhere: Record<string, unknown> = {
            tenantId: tenant.id,
            ticketNo: parseInt(action.ticketNo),
          };

          // ถ้ามี prefix → filter ตาม system
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
            await replyMessage(tenant.lineOaToken, event.replyToken, [
              { type: "text", text: `ไม่พบ Ticket ${displayNo} ค่ะ` } as never,
            ]);
          } else {
            await replyMessage(tenant.lineOaToken, event.replyToken, [
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

        case "GEMINI_QUERY":
          await replyMessage(tenant.lineOaToken, event.replyToken, [
            {
              type: "text",
              text: "🔍 น้องนาโนกำลังค้นหาข้อมูลให้ค่ะ กรุณารอสักครู่...",
            } as never,
          ]);
          break;

        case "UPGRADE_REQUIRED":
          await replyMessage(tenant.lineOaToken, event.replyToken, [
            upgradeRequiredFlex(tenant.plan, botMeta) as never,
          ]);
          break;
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ status: "ok" }); // LINE expects 200
  }
}
