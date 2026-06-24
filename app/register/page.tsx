"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, ArrowLeft, Check, Loader2, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    email: "",
    phone: "",
    plan: "TRIAL",
  });
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSlugChange = (value: string) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setForm((prev) => ({ ...prev, slug }));

    if (slug.length >= 3) {
      setSlugStatus("checking");
      // Simulate check
      setTimeout(() => {
        setSlugStatus(slug === "demo" ? "taken" : "available");
      }, 500);
    } else {
      setSlugStatus("idle");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }

      // สมัครสำเร็จ — redirect
      window.location.href = `/login?tenant=${form.slug}`;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 bg-gradient-mesh">
      <div className="max-w-lg mx-auto px-4 pt-12 pb-20">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft className="w-4 h-4" />
            กลับหน้าหลัก
          </Link>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-nano flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">สมัครใช้งานน้องนาโน</h1>
          <p className="text-gray-600 mt-2">เริ่มทดลองใช้ฟรี 14 วัน ไม่ต้องใส่บัตรเครดิต</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="input-label">ชื่อองค์กร *</label>
            <input
              type="text"
              className="input-field"
              placeholder="เช่น บริษัท ABC จำกัด"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="input-label">Subdomain (URL) *</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="input-field"
                placeholder="abc-company"
                value={form.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                required
                minLength={3}
                maxLength={30}
              />
              <span className="text-sm text-gray-400 whitespace-nowrap">.technomand-ai.cloud</span>
            </div>
            {slugStatus === "checking" && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                กำลังตรวจสอบ...
              </p>
            )}
            {slugStatus === "available" && (
              <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                <Check className="w-3 h-3" />
                ใช้งานได้
              </p>
            )}
            {slugStatus === "taken" && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Subdomain นี้ถูกใช้แล้ว
              </p>
            )}
          </div>

          <div>
            <label className="input-label">อีเมลติดต่อ *</label>
            <input
              type="email"
              className="input-field"
              placeholder="admin@company.com"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="input-label">เบอร์โทรศัพท์</label>
            <input
              type="tel"
              className="input-field"
              placeholder="08X-XXX-XXXX"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div>
            <label className="input-label">แผนที่ต้องการ</label>
            <select
              className="input-field"
              value={form.plan}
              onChange={(e) => setForm((prev) => ({ ...prev, plan: e.target.value }))}
            >
              <option value="TRIAL">ทดลองใช้ฟรี 14 วัน</option>
              <option value="STARTER">Starter — ฿990/เดือน</option>
              <option value="PRO">Pro — ฿2,990/เดือน</option>
              <option value="ENTERPRISE">Enterprise — ติดต่อทีมงาน</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || slugStatus === "taken"}
            className="btn-primary w-full !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังสร้างบัญชี...
              </span>
            ) : (
              "เริ่มทดลองใช้ฟรี"
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            การสมัครถือว่าคุณยอมรับ{" "}
            <a href="#" className="text-nano-500 hover:underline">
              เงื่อนไขการใช้งาน
            </a>{" "}
            และ{" "}
            <a href="#" className="text-nano-500 hover:underline">
              นโยบายความเป็นส่วนตัว
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
