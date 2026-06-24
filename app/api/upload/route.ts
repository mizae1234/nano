import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "@/lib/r2";
import { getNanoSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const session = await getNanoSession();
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const ticketId = (formData.get("ticketId") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "ไม่พบไฟล์ที่อัปโหลด" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileExtension = file.name.split(".").pop();
    const uniqueKey = `servicesystem/${ticketId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;

    const bucketName = process.env.R2_BUCKET_NAME || "";
    const publicUrl = process.env.R2_PUBLIC_URL || "";

    if (!bucketName || !process.env.R2_ACCOUNT_ID) {
      return NextResponse.json({ error: "ระบบยังไม่ได้ตั้งค่า Cloudflare R2" }, { status: 500 });
    }

    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueKey,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const imageUrl = `${publicUrl}/${uniqueKey}`;
    return NextResponse.json({ url: imageUrl });
  } catch (error) {
    console.error("Upload to R2 failed:", error);
    return NextResponse.json({ error: "การอัปโหลดไฟล์ล้มเหลว" }, { status: 500 });
  }
}
