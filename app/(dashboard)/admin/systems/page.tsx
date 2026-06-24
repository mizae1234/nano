"use client";

import { useState, useEffect } from "react";
import { Server, Plus, Pencil, Trash2, Loader2, X, Check } from "lucide-react";

interface SystemItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  ticketPrefix: string;
  isActive: boolean;
  defaultAssignee: { id: string; displayName: string } | null;
  stats: { total: number; open: number; inProgress: number };
}

const EMOJI_OPTIONS = ["🛍", "📢", "💰", "🤝", "🛒", "👥", "🧬", "🎓", "🏢", "📊", "🌿", "⚙️", "📱", "💻", "🔧"];

export default function SystemsPage() {
  const [systems, setSystems] = useState<SystemItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", description: "", color: "#3B82F6", icon: "⚙️", ticketPrefix: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { loadSystems(); }, []);

  async function loadSystems() {
    const res = await fetch("/api/systems");
    const data = await res.json();
    setSystems(data.systems || []);
    setLoading(false);
  }

  async function handleCreate() {
    setError("");
    if (!form.code || !form.name || !form.ticketPrefix) {
      setError("กรุณากรอก Code, ชื่อ และ Ticket Prefix");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/systems", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setSaving(false);
      return;
    }
    setShowForm(false);
    setForm({ code: "", name: "", description: "", color: "#3B82F6", icon: "⚙️", ticketPrefix: "" });
    setSaving(false);
    loadSystems();
  }

  async function handleToggle(id: string, isActive: boolean) {
    await fetch(`/api/systems/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    loadSystems();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-nano-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Server className="w-5 h-5 text-nano-500" />
            จัดการระบบ
          </h1>
          <p className="text-sm text-gray-500 mt-1">เพิ่ม/แก้ไขระบบที่ PM ดูแล</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          เพิ่มระบบ
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card border-nano-200 bg-nano-50/30">
          <h3 className="font-semibold text-gray-900 mb-4">เพิ่มระบบใหม่</h3>
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-4">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Code (ตัวเล็ก, ไม่เว้นวรรค)</label>
              <input
                className="input-field mt-1"
                placeholder="เช่น hris, crm"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/\s/g, "") })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">ชื่อระบบ</label>
              <input
                className="input-field mt-1"
                placeholder="เช่น HRIS, CRM"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Ticket Prefix (ตัวใหญ่, 2-5 ตัว)</label>
              <input
                className="input-field mt-1"
                placeholder="เช่น HRS, CRM"
                value={form.ticketPrefix}
                onChange={(e) => setForm({ ...form, ticketPrefix: e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5) })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">สี</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
                <span className="text-sm text-gray-500">{form.color}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Icon</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setForm({ ...form, icon: e })}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                      form.icon === e
                        ? "bg-nano-100 ring-2 ring-nano-300"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">คำอธิบาย</label>
              <input
                className="input-field mt-1"
                placeholder="คำอธิบายสั้นๆ"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="mt-4 p-3 bg-white rounded-lg border border-gray-100">
            <span className="text-xs text-gray-400">ตัวอย่าง Ticket Number:</span>
            <span className="ml-2 font-mono font-bold" style={{ color: form.color }}>
              {form.ticketPrefix || "XXX"}-1
            </span>
            <span className="mx-2 text-gray-300">|</span>
            <span className="text-sm">
              {form.icon || "⚙️"} {form.name || "ชื่อระบบ"}
            </span>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              สร้างระบบ
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* System List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {systems.map((sys) => (
          <div
            key={sys.id}
            className={`card border transition-all hover:shadow-md ${
              !sys.isActive ? "opacity-50" : ""
            }`}
            style={{ borderColor: `${sys.color}30` }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${sys.color}15` }}
                >
                  {sys.icon || "⚙️"}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{sys.name}</h3>
                  <p className="text-xs text-gray-400 font-mono">{sys.code} • {sys.ticketPrefix}</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle(sys.id, sys.isActive)}
                className={`text-xs px-2 py-1 rounded-full ${
                  sys.isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {sys.isActive ? "เปิด" : "ปิด"}
              </button>
            </div>

            {sys.description && (
              <p className="text-xs text-gray-500 mt-2">{sys.description}</p>
            )}

            <div className="flex gap-3 mt-3 pt-3 border-t border-gray-50">
              <div className="text-center flex-1">
                <div className="text-lg font-bold" style={{ color: sys.color }}>
                  {sys.stats.total}
                </div>
                <div className="text-[10px] text-gray-400">ทั้งหมด</div>
              </div>
              <div className="text-center flex-1">
                <div className="text-lg font-bold text-red-500">{sys.stats.open}</div>
                <div className="text-[10px] text-gray-400">เปิด</div>
              </div>
              <div className="text-center flex-1">
                <div className="text-lg font-bold text-amber-500">{sys.stats.inProgress}</div>
                <div className="text-[10px] text-gray-400">กำลังทำ</div>
              </div>
            </div>

            {sys.defaultAssignee && (
              <div className="mt-3 pt-2 border-t border-gray-50 text-xs text-gray-500">
                👤 Dev หลัก: {sys.defaultAssignee.displayName}
              </div>
            )}
          </div>
        ))}
      </div>

      {systems.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-400">
          <Server className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">ยังไม่มีระบบ — กดปุ่ม "เพิ่มระบบ" เพื่อเริ่มต้น</p>
        </div>
      )}
    </div>
  );
}
