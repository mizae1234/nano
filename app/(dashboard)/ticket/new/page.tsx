"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface SystemItem {
  id: string;
  name: string;
  code: string;
  icon: string | null;
  color: string;
  isActive: boolean;
}

interface DeptItem {
  id: string;
  name: string;
  isActive: boolean;
}

interface CategoryItem {
  id: string;
  name: string;
  departmentId: string | null;
}

const TICKET_TYPES = [
  { value: "BUG", label: "ปัญหาระบบ", icon: "🐛" },
  { value: "FEATURE", label: "ขอฟีเจอร์", icon: "✨" },
  { value: "TASK", label: "งานทั่วไป", icon: "📋" },
  { value: "QUESTION", label: "คำถาม/สอบถาม", icon: "❓" },
];

export default function NewTicketPage() {
  const router = useRouter();
  const [systems, setSystems] = useState<SystemItem[]>([]);
  const [departments, setDepartments] = useState<DeptItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    departmentId: "",
    categoryId: "",
    systemId: "",
    ticketType: "BUG",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // โหลดระบบและแผนก
  useEffect(() => {
    Promise.all([
      fetch("/api/systems").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
    ])
      .then(([sysData, deptData]) => {
        const activeSys = (sysData.systems || []).filter((s: SystemItem) => s.isActive);
        const activeDept = (deptData || []).filter((d: DeptItem) => d.isActive);
        setSystems(activeSys);
        setDepartments(activeDept);
        if (activeSys.length > 0) {
          setForm((f) => ({ ...f, systemId: activeSys[0].id }));
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // โหลดหมวดหมู่เมื่อมีการเปลี่ยนแผนก
  useEffect(() => {
    if (!form.departmentId) {
      setCategories([]);
      setForm((f) => ({ ...f, categoryId: "" }));
      return;
    }

    fetch(`/api/categories?departmentId=${form.departmentId}`)
      .then((r) => r.json())
      .then((data) => {
        setCategories(data || []);
        setForm((f) => ({ ...f, categoryId: "" }));
      })
      .catch((err) => console.error(err));
  }, [form.departmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.systemId) {
      setError("กรุณาเลือกระบบ");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เกิดข้อผิดพลาดในการส่งข้อมูล");
        setIsSubmitting(false);
        return;
      }
      router.push("/ticket");
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-nano-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/ticket"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        กลับ
      </Link>

      <div className="card">
        <h1 className="text-xl font-bold text-gray-900 mb-6">แจ้งปัญหาใหม่</h1>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-xl p-4 mb-5 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* เลือกระบบ */}
          <div>
            <label className="input-label">ระบบที่พบปัญหา *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
              {systems.map((sys) => (
                <button
                  key={sys.id}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, systemId: sys.id }))}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all text-left flex items-center gap-2 ${
                    form.systemId === sys.id
                      ? "ring-2 ring-offset-1 border-transparent text-white"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                  style={{
                    backgroundColor: form.systemId === sys.id ? sys.color : undefined,
                    boxShadow: form.systemId === sys.id ? `0 4px 12px ${sys.color}30` : undefined,
                  }}
                >
                  <span className="text-lg">{sys.icon || "⚙️"}</span>
                  <span className="truncate">{sys.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* เลือกประเภทปัญหา */}
          <div>
            <label className="input-label">ประเภทงาน *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
              {TICKET_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, ticketType: t.value }))}
                  className={`p-2.5 rounded-xl border text-sm font-medium transition-all flex items-center gap-2 justify-center ${
                    form.ticketType === t.value
                      ? "border-nano-500 bg-nano-50 text-nano-700 ring-2 ring-nano-200"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="input-label">หัวข้อปัญหา *</label>
            <input
              type="text"
              className="input-field"
              placeholder="เช่น อินเตอร์เน็ตช้า ชั้น 3, เข้าสู่ระบบไม่ได้"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="input-label">รายละเอียด *</label>
            <textarea
              className="input-field !min-h-[120px] resize-y"
              placeholder="อธิบายรายละเอียดของปัญหา..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">ส่งเรื่องไปยังแผนก</label>
              <select
                className="input-field"
                value={form.departmentId}
                onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}
              >
                <option value="">-- เลือกแผนก (แนะนำ) --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label">หมวดหมู่</label>
              <select
                className="input-field"
                value={form.categoryId}
                onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                disabled={!form.departmentId}
              >
                <option value="">
                  {form.departmentId ? "-- เลือกหมวดหมู่ --" : "-- กรุณาเลือกแผนกก่อน --"}
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="input-label">ลำดับความสำคัญ</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: "LOW", label: "ต่ำ", color: "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300" },
                { value: "MEDIUM", label: "ปานกลาง", color: "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300" },
                { value: "HIGH", label: "สูง", color: "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300" },
                { value: "URGENT", label: "ด่วนมาก", color: "border-red-200 bg-red-50 text-red-700 hover:border-red-300" },
              ].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    form.priority === p.value
                      ? `${p.color} ring-2 ring-offset-1 ring-current`
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                  onClick={() => setForm((prev) => ({ ...prev, priority: p.value }))}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {form.priority === "URGENT" && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Ticket ด่วนมากจะแจ้งเตือนบอทของระบบ / ทีม IT ทันที
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Link href="/ticket" className="btn-ghost">
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !form.title || !form.description || !form.systemId}
              className="btn-primary disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังส่ง...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  ส่งเรื่อง
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
