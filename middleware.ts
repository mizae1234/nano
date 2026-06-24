// ─── น้องนาโน — Middleware ────────────────────────────────────

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes ที่ไม่ต้องตรวจสอบ
const PUBLIC_PATHS = [
  "/",
  "/register",
  "/login",
  "/login-platform",
  "/expired",
  "/api/auth",
  "/api/webhook",
  "/_next",
  "/favicon.ico",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ข้าม public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ข้าม static files
  if (
    pathname.includes(".") &&
    !pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  // Platform admin routes — ตรวจสอบแยก
  if (pathname.startsWith("/platform") || pathname.startsWith("/api/platform")) {
    // Platform auth จะตรวจสอบใน API route เอง
    return NextResponse.next();
  }

  // ตรวจสอบ tenant context สำหรับ dashboard routes
  // Dev mode: ใช้ query param ?tenant=slug
  // Production: ใช้ subdomain
  const tenantSlug = resolveTenantSlugFromRequest(request);

  if (!tenantSlug && pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "ไม่พบข้อมูลองค์กร" },
      { status: 400 }
    );
  }

  // เพิ่ม tenant slug ใน header เพื่อส่งต่อให้ API routes
  const response = NextResponse.next();
  if (tenantSlug) {
    response.headers.set("x-tenant-slug", tenantSlug);
  }

  return response;
}

function resolveTenantSlugFromRequest(request: NextRequest): string | null {
  // Query param — ใช้ได้ทุก environment
  const tenantParam = request.nextUrl.searchParams.get("tenant");
  if (tenantParam) return tenantParam;

  const hostname = request.headers.get("host") || "";
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "technomand-ai.cloud";
  const mainHost = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
    : "";

  // ถ้าเป็น main host (nano.technomand-ai.cloud) ให้ใช้ default tenant
  if (mainHost && (hostname === mainHost || hostname === `${mainHost}:3000`)) {
    return process.env.DEV_TENANT_SLUG || "demo";
  }

  // Production: ใช้ subdomain (สำหรับ multi-tenant ในอนาคต เช่น abc.technomand-ai.cloud)
  if (hostname.endsWith(`.${appDomain}`)) {
    const slug = hostname.replace(`.${appDomain}`, "");
    if (slug && !slug.includes(".")) {
      return slug;
    }
  }

  // Default fallback
  return process.env.DEV_TENANT_SLUG || "demo";
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
