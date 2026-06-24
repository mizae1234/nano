// ─── น้องนาโน — LINE Integration ─────────────────────────────

import { decrypt } from "./encrypt";
import crypto from "crypto";

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

interface LineMessage {
  type: string;
  text?: string;
  altText?: string;
  contents?: unknown;
  quickReply?: unknown;
}

/**
 * ตรวจสอบ X-Line-Signature ว่ามาจาก LINE จริง
 */
export function validateLineSignature(
  body: string,
  signature: string,
  encryptedSecret: string
): boolean {
  const secret = decrypt(encryptedSecret);
  const hash = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64");
  return hash === signature;
}

/**
 * ดึง profile จาก LINE User ID
 */
export async function getLineProfile(
  accessToken: string,
  userId: string
): Promise<LineProfile> {
  const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`ไม่สามารถดึงข้อมูล LINE profile ได้: ${res.statusText}`);
  }

  return res.json();
}

/**
 * ส่ง reply message กลับไปยัง LINE
 */
export async function replyMessage(
  encryptedToken: string,
  replyToken: string,
  messages: LineMessage[]
): Promise<void> {
  const token = decrypt(encryptedToken);

  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      replyToken,
      messages,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("LINE reply error:", error);
    throw new Error(`ส่งข้อความกลับ LINE ไม่สำเร็จ: ${res.statusText}`);
  }
}

/**
 * ส่ง push message ไปยังผู้ใช้หรือกลุ่ม
 */
export async function pushMessage(
  encryptedToken: string,
  to: string,
  messages: LineMessage[]
): Promise<void> {
  const token = decrypt(encryptedToken);

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to,
      messages,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("LINE push error:", error);
    throw new Error(`ส่งข้อความ LINE ไม่สำเร็จ: ${res.statusText}`);
  }
}

/**
 * ส่ง multicast message ไปยังหลาย user
 */
export async function multicastMessage(
  encryptedToken: string,
  to: string[],
  messages: LineMessage[]
): Promise<void> {
  const token = decrypt(encryptedToken);

  const res = await fetch("https://api.line.me/v2/bot/message/multicast", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to,
      messages,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("LINE multicast error:", error);
  }
}

/**
 * ทดสอบการเชื่อมต่อ LINE OA Token
 */
export async function testLineConnection(
  encryptedToken: string
): Promise<{ success: boolean; botName?: string; error?: string }> {
  try {
    const token = decrypt(encryptedToken);
    const res = await fetch("https://api.line.me/v2/bot/info", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      return { success: false, error: `LINE API ตอบกลับ: ${res.statusText}` };
    }

    const data = await res.json();
    return { success: true, botName: data.displayName };
  } catch (error) {
    return {
      success: false,
      error: `ไม่สามารถเชื่อมต่อ LINE ได้: ${(error as Error).message}`,
    };
  }
}

interface LineGroupSummary {
  groupId: string;
  groupName: string;
  pictureUrl?: string;
}

/**
 * ดึงชื่อและข้อมูลสรุปของ LINE Group
 */
export async function getLineGroupSummary(
  encryptedToken: string,
  groupId: string
): Promise<LineGroupSummary> {
  const token = decrypt(encryptedToken);
  const res = await fetch(`https://api.line.me/v2/bot/group/${groupId}/summary`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`ไม่สามารถดึงข้อมูล LINE Group Summary ได้: ${res.statusText}`);
  }

  return res.json();
}

/**
 * ดึง profile สมาชิกกลุ่ม LINE
 */
export async function getLineGroupMemberProfile(
  encryptedToken: string,
  groupId: string,
  userId: string
): Promise<LineProfile> {
  const token = decrypt(encryptedToken);
  const res = await fetch(`https://api.line.me/v2/bot/group/${groupId}/member/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`ไม่สามารถดึงข้อมูล LINE Group Member profile ได้: ${res.statusText}`);
  }

  return res.json();
}
