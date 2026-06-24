"use client";

import { useState, useEffect } from "react";
import { Building2, Plus, Users, Ticket, Edit, Power, Loader2, X, Check } from "lucide-react";

interface DepartmentItem {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count: {
    users: number;
    tickets: number;
  };
}

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // States สำหรับ Form & Modal
  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDepartments();
  }, []);

  async function loadDepartments() {
    try {
      const res = await fetch("/api/departments");
      const data = await res.json();
      setDepartments(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);
    setError("");

    try {
      const isEdit = !!editingDept;
      const url = isEdit ? `/api/departments/${editingDept.id}` : "/api/departments";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        setSaving(false);
        return;
      }

      setShowForm(false);
      setEditingDept(null);
      setForm({ name: "", description: "" });
      loadDepartments();
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(id: string, currentActive: boolean) {
    try {
      const res = await fetch(`/api/departments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        loadDepartments();
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-nano-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{departments.length} แผนก</p>
        <button
          className="btn-primary text-sm flex items-center gap-1.5"
          onClick={() => {
            setEditingDept(null);
            setForm({ name: "", description: "" });
            setShowForm(true);
          }}
        >
          <Plus className="w-4 h-4" />
          สร้างแผนกใหม่
        </button>
      </div>

      {showForm && (
        <div className="card border-nano-200 bg-nano-50/30">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {editingDept ? `แก้ไขแผนก: ${editingDept.name}` : "สร้างแผนกใหม่"}
          </h3>
          
          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-xl p-3 mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="input-label">ชื่อแผนก *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="เช่น IT, HR, ฝ่ายบริการลูกค้า"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="input-label">คำอธิบาย</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="คำอธิบายสั้นๆ ของแผนก"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary text-sm flex items-center justify-center gap-1"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingDept ? "บันทึก" : "สร้าง"}
              </button>
              <button
                type="button"
                className="btn-ghost text-sm"
                onClick={() => {
                  setShowForm(false);
                  setEditingDept(null);
                }}
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => (
          <div key={dept.id} className={`card-hover ${!dept.isActive ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-nano-50 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-nano-500" />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setEditingDept(dept);
                    setForm({ name: dept.name, description: dept.description || "" });
                    setShowForm(true);
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100"
                  title="แก้ไข"
                >
                  <Edit className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <button
                  onClick={() => handleToggleStatus(dept.id, dept.isActive)}
                  className="p-1.5 rounded-lg hover:bg-gray-100"
                  title={dept.isActive ? "ปิดแผนก" : "เปิดแผนก"}
                >
                  <Power className={`w-3.5 h-3.5 ${dept.isActive ? "text-emerald-500" : "text-gray-400"}`} />
                </button>
              </div>
            </div>

            <h3 className="font-semibold text-gray-900 mb-1">{dept.name}</h3>
            <p className="text-xs text-gray-500 mb-4">{dept.description || "—"}</p>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {dept._count.users} คน
              </span>
              <span className="flex items-center gap-1">
                <Ticket className="w-3.5 h-3.5" />
                {dept._count.tickets} Ticket (เปิด)
              </span>
            </div>
          </div>
        ))}
        {departments.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400 card">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">ยังไม่มีแผนกในระบบ — กดปุ่ม "สร้างแผนกใหม่" เพื่อเริ่มต้น</p>
          </div>
        )}
      </div>
    </div>
  );
}
