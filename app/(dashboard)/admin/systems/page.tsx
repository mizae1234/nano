"use client";

import { useState, useEffect } from "react";
import { Server, Plus, Pencil, Trash2, Loader2, Check } from "lucide-react";

interface SystemItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  ticketPrefix: string;
  isActive: boolean;
  isDefault: boolean;
  lineOaToken?: string | null;
  lineOaSecret?: string | null;
  defaultAssignee: { id: string; displayName: string } | null;
  stats: { total: number; open: number; inProgress: number };
}

const EMOJI_OPTIONS = ["🛍", "📢", "💰", "🤝", "🛒", "👥", "🧬", "🎓", "🏢", "📊", "🌿", "⚙️", "📱", "💻", "🔧"];

export default function SystemsPage() {
  const [systems, setSystems] = useState<SystemItem[]>([]);
  const [users, setUsers] = useState<{ id: string; displayName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", description: "", color: "#3B82F6", icon: "⚙️", ticketPrefix: "", isDefault: false });
  
  const [editingSystem, setEditingSystem] = useState<SystemItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
    icon: "⚙️",
    defaultAssigneeId: "",
    isDefault: false,
  });

  const [editingLineOa, setEditingLineOa] = useState<SystemItem | null>(null);
  const [lineOaForm, setLineOaForm] = useState({
    lineOaToken: "",
    lineOaSecret: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { loadSystems(); }, []);

  async function loadSystems() {
    const [systemsRes, usersRes] = await Promise.all([
      fetch("/api/systems").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()).catch(() => []),
    ]);
    setSystems(systemsRes.systems || []);
    setUsers(usersRes || []);
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
    setForm({ code: "", name: "", description: "", color: "#3B82F6", icon: "⚙️", ticketPrefix: "", isDefault: false });
    setSaving(false);
    loadSystems();
  }

  function handleEditClick(sys: SystemItem) {
    setEditingSystem(sys);
    setEditForm({
      name: sys.name,
      description: sys.description || "",
      color: sys.color || "#3B82F6",
      icon: sys.icon || "⚙️",
      defaultAssigneeId: sys.defaultAssignee?.id || "",
      isDefault: sys.isDefault || false,
    });
    setEditingLineOa(null);
    setShowForm(false);
    setError("");
  }

  async function handleUpdate() {
    if (!editingSystem) return;
    setError("");
    if (!editForm.name) {
      setError("กรุณากรอกชื่อระบบ");
      return;
    }
    setSaving(true);

    const payload = {
      name: editForm.name,
      description: editForm.description || null,
      color: editForm.color,
      icon: editForm.icon,
      defaultAssigneeId: editForm.defaultAssigneeId || null,
      isDefault: editForm.isDefault,
    };

    const res = await fetch(`/api/systems/${editingSystem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setSaving(false);
      return;
    }
    setEditingSystem(null);
    setSaving(false);
    loadSystems();
  }

  function handleLineOaClick(sys: SystemItem) {
    setEditingLineOa(sys);
    setLineOaForm({
      lineOaToken: sys.lineOaToken ? "●●●●●●●●●●" : "",
      lineOaSecret: sys.lineOaSecret ? "●●●●●●●●●●" : "",
    });
    setEditingSystem(null);
    setShowForm(false);
    setError("");
  }

  async function handleUpdateLineOa() {
    if (!editingLineOa) return;
    setError("");
    setSaving(true);

    const payload: any = {};
    if (lineOaForm.lineOaToken !== "●●●●●●●●●●") {
      payload.lineOaToken = lineOaForm.lineOaToken || null;
    }
    if (lineOaForm.lineOaSecret !== "●●●●●●●●●●") {
      payload.lineOaSecret = lineOaForm.lineOaSecret || null;
    }

    const res = await fetch(`/api/systems/${editingLineOa.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setSaving(false);
      return;
    }
    setEditingLineOa(null);
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

  async function handleDeleteClick(sys: SystemItem) {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบระบบ "${sys.name}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/systems/${sys.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "เกิดข้อผิดพลาดในการลบระบบ");
        return;
      }
      if (data.message) {
        alert(data.message);
      }
      loadSystems();
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
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
          onClick={() => {
            setShowForm(true);
            setEditingSystem(null);
          }}
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
            <div className="flex items-center gap-2 mt-2 sm:col-span-2">
              <input
                type="checkbox"
                id="create-isDefault"
                className="w-4 h-4 text-nano-600 border-gray-300 rounded focus:ring-nano-500 cursor-pointer"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              />
              <label htmlFor="create-isDefault" className="text-sm font-medium text-gray-700 cursor-pointer">
                ตั้งเป็นระบบเริ่มต้นหลัก (Default System)
              </label>
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

      {/* Edit Form */}
      {editingSystem && (
        <div className="card border-nano-200 bg-nano-50/30">
          <h3 className="font-semibold text-gray-900 mb-4">แก้ไขระบบ: {editingSystem.name}</h3>
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-4">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">ชื่อระบบ</label>
              <input
                className="input-field mt-1"
                placeholder="เช่น HRIS, CRM"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Dev หลัก (Default Assignee)</label>
              <select
                className="input-field mt-1"
                value={editForm.defaultAssigneeId}
                onChange={(e) => setEditForm({ ...editForm, defaultAssigneeId: e.target.value })}
              >
                <option value="">-- เลือก Dev หลัก --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">สี</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  value={editForm.color}
                  onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                />
                <span className="text-sm text-gray-500">{editForm.color}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Icon</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEditForm({ ...editForm, icon: e })}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                      editForm.icon === e
                        ? "bg-nano-100 ring-2 ring-nano-300"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700">คำอธิบาย</label>
              <input
                className="input-field mt-1"
                placeholder="คำอธิบายสั้นๆ"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            {/* LINE OA configuration fields moved to a separate settings panel below */}
            <div className="flex items-center gap-2 mt-2 sm:col-span-2">
              <input
                type="checkbox"
                id="edit-isDefault"
                className="w-4 h-4 text-nano-600 border-gray-300 rounded focus:ring-nano-500 cursor-pointer"
                checked={editForm.isDefault}
                onChange={(e) => setEditForm({ ...editForm, isDefault: e.target.checked })}
              />
              <label htmlFor="edit-isDefault" className="text-sm font-medium text-gray-700 cursor-pointer">
                ตั้งเป็นระบบเริ่มต้นหลัก (Default System)
              </label>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleUpdate}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              บันทึกการแก้ไข
            </button>
            <button onClick={() => setEditingSystem(null)} className="btn-secondary">
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* LINE OA Connection Form */}
      {editingLineOa && (
        <div className="card border-purple-200 bg-purple-50/20">
          <h3 className="font-semibold text-purple-900 mb-4 flex items-center gap-2">
            🔌 ตั้งค่า LINE OA สำหรับระบบ: {editingLineOa.name}
          </h3>
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-4">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">LINE OA Access Token</label>
              <input
                type="password"
                className="input-field mt-1"
                placeholder="LINE Channel Access Token"
                value={lineOaForm.lineOaToken}
                onChange={(e) => setLineOaForm({ ...lineOaForm, lineOaToken: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">LINE OA Channel Secret</label>
              <input
                type="password"
                className="input-field mt-1"
                placeholder="LINE Channel Secret"
                value={lineOaForm.lineOaSecret}
                onChange={(e) => setLineOaForm({ ...lineOaForm, lineOaSecret: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleUpdateLineOa}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
              style={{ backgroundColor: "#7c3aed" }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              บันทึกการเชื่อมต่อ LINE
            </button>
            <button onClick={() => setEditingLineOa(null)} className="btn-secondary">
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
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    {sys.name}
                    {sys.isDefault && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                        เริ่มต้น
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">{sys.code} • {sys.ticketPrefix}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleEditClick(sys)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-nano-600 transition-colors"
                  title="แก้ไข"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteClick(sys)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors"
                  title="ลบระบบ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
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

            <div className="mt-3 pt-2 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
              <span>{sys.defaultAssignee ? `👤 Dev หลัก: ${sys.defaultAssignee.displayName}` : ""}</span>
              <button
                onClick={() => handleLineOaClick(sys)}
                className="text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1 font-medium transition-colors cursor-pointer"
                title="ตั้งค่า LINE OA"
              >
                🔌 ตั้งค่า LINE OA
              </button>
            </div>
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
