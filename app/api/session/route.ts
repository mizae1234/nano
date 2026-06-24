// ─── น้องนาโน — Session API ──────────────────────────────────

import { NextResponse } from "next/server";
import { getNanoSession } from "@/lib/session";

export async function GET() {
  const session = await getNanoSession();

  if (!session) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: session });
}
