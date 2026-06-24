"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Bot, ShieldCheck, Loader2 } from "lucide-react";

// ─── LIFF type stub ──────────────────────────────────────────
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    liff: any;
  }
}

function LoginPageContent() {
  const [devRole, setDevRole] = useState("SUPER_ADMIN");
  const [isLoading, setIsLoading] = useState(false);
  const [liffLoading, setLiffLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get("tenant") || "demo";
  const liffInitialized = useRef(false);

  const getRedirectUrl = () => {
    const redirectParam = searchParams.get("redirect");
    if (redirectParam) {
      try {
        const url = new URL(redirectParam, window.location.origin);
        url.searchParams.set("tenant", tenantSlug);
        return url.pathname + url.search;
      } catch {
        return `${redirectParam}${redirectParam.includes("?") ? "&" : "?"}tenant=${tenantSlug}`;
      }
    }
    return `/ticket?tenant=${tenantSlug}`;
  };

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

  // ─── โหลด LIFF SDK ──────────────────────────────────────────
  useEffect(() => {
    if (!liffId || liffInitialized.current) return;

    const script = document.createElement("script");
    script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
    script.async = true;
    script.onload = async () => {
      try {
        await window.liff.init({ liffId });
        liffInitialized.current = true;

        // ถ้า LIFF redirect กลับมาพร้อม token แล้ว ให้ login อัตโนมัติ
        if (window.liff.isLoggedIn()) {
          await doLineLogin();
        }
      } catch (err) {
        console.error("LIFF init error:", err);
      }
    };
    document.head.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liffId]);

  // ─── ส่ง token ไปยัง backend ────────────────────────────────
  const doLineLogin = async () => {
    setLiffLoading(true);
    setError("");
    try {
      const accessToken = window.liff.getAccessToken();
      const res = await fetch("/api/auth/line-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, tenantSlug }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "เข้าสู่ระบบ LINE ไม่สำเร็จ");
        setLiffLoading(false);
        return;
      }

      // Login สำเร็จ
      window.location.href = getRedirectUrl();
    } catch (err) {
      console.error("LINE login error:", err);
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      setLiffLoading(false);
    }
  };

  const handleLineLogin = async () => {
    if (!liffId) {
      setError("ยังไม่ได้ตั้งค่า LIFF ID กรุณาติดต่อผู้ดูแลระบบ");
      return;
    }

    setError("");

    // ถ้า LIFF ยังไม่ init หรือ SDK ยังโหลดไม่เสร็จ
    if (!window.liff) {
      setError("กำลังโหลด LINE SDK กรุณารอสักครู่");
      return;
    }

    if (!liffInitialized.current) {
      setError("กำลังเตรียม LINE Login กรุณารอสักครู่");
      return;
    }

    if (window.liff.isLoggedIn()) {
      // มี session อยู่แล้ว
      await doLineLogin();
    } else {
      // redirect ไปยัง LINE login
      window.liff.login({ redirectUri: window.location.href });
    }
  };

  const handleDevLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug,
          role: devRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "เข้าสู่ระบบไม่สำเร็จ");
        setIsLoading(false);
        return;
      }

      // Login สำเร็จ — redirect ไป ticket page
      window.location.href = getRedirectUrl();
    } catch (err) {
      console.error("Dev login error:", err);
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-gradient-mesh px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-nano shadow-nano mb-4">
            <Bot className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">น้องนาโน</h1>
          <p className="text-gray-500 mt-1">เข้าสู่ระบบ Service Ticket</p>
          <p className="text-xs text-gray-400 mt-1">
            Tenant: <span className="font-mono text-nano-500">{tenantSlug}</span>
          </p>
        </div>

        <div className="card space-y-4">
          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* LINE Login */}
          <button
            onClick={handleLineLogin}
            disabled={liffLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-medium text-white bg-[#06C755] hover:bg-[#05b34d] transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {liffLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                กำลังเข้าสู่ระบบ...
              </>
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                เข้าสู่ระบบด้วย LINE
              </>
            )}
          </button>

          {/* Dev Bypass */}
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-gray-400">
                  สำหรับนักพัฒนา
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <select
                className="input-field text-sm"
                value={devRole}
                onChange={(e) => setDevRole(e.target.value)}
              >
                <option value="SUPER_ADMIN">ผู้ดูแลสูงสุด (SUPER_ADMIN)</option>
                <option value="ADMIN">ผู้ดูแลระบบ (ADMIN)</option>
                <option value="DEPT_ADMIN">หัวหน้าแผนก (DEPT_ADMIN)</option>
                <option value="IT">เจ้าหน้าที่ IT (IT)</option>
                <option value="USER">ผู้ใช้งาน (USER)</option>
              </select>
              <button
                onClick={handleDevLogin}
                disabled={isLoading}
                className="btn-ghost w-full text-sm border border-gray-200 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    กำลังเข้าสู่ระบบ...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Dev Login (ทดสอบ)
                  </>
                )}
              </button>
            </div>
          </>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-nano-500 animate-spin" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
