"use client";

import { useState } from "react";
import { Shield, LogIn, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPlatformPage() {
  const [email, setEmail] = useState("admin@nanoticket.app");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/platform-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "เกิดข้อผิดพลาด");
        return;
      }

      router.push("/platform");
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-gradient-mesh px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-red-500 shadow-lg mb-4">
            <Shield className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Admin</h1>
          <p className="text-gray-500 mt-1">เข้าสู่ระบบผู้ให้บริการ</p>
        </div>

        <form className="card space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          <div>
            <label className="input-label">อีเมล</label>
            <input
              type="email"
              className="input-field"
              placeholder="admin@nanoticket.app"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="input-label">รหัสผ่าน</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn-primary w-full !py-3 bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600 !shadow-none"
            disabled={isLoading}
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />กำลังเข้าสู่ระบบ...</>
            ) : (
              <><LogIn className="w-4 h-4 mr-2" />เข้าสู่ระบบ</>
            )}
          </button>

          <Link href="/" className="block text-center text-sm text-gray-500 hover:text-gray-700">
            กลับหน้าหลัก
          </Link>
        </form>
      </div>
    </div>
  );
}
