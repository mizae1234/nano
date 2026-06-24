"use client";

import { useState, useEffect } from "react";
import { Tag, Plus, Edit, Trash2, Loader2, X, Check } from "lucide-react";

interface CategoryItem {
  id: string;
  name: string;
  departmentId: string | null;
  department: { id: string; name: string } | null;
  _count?: { tickets: number };
}

interface DeptItem {
  id: string;
  name: string;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [departments, setDepartments] = useState<DeptItem[]>([]);
  const [loading, setLoading] = useState(true);

  // States สำหรับ Dialog & Form
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [form, setForm] = useState({ name: "", departmentId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [catRes, deptRes] = await Promise.all([
        fetch("/api/categories").then((r) => r.json()),
        fetch("/api/departments").then((r) => r.json()),
      ]);
      setCategories(Array.isArray(catRes) ? catRes : []);
      setDepartments(Array.isArray(deptRes) ? deptRes : []);
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
      const isEdit = !!editingCategory;
      const url = isEdit ? `/api/categories/${editingCategory.id}` : "/api/categories";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          departmentId: form.departmentId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        setSaving(false);
        return;
      }

      setShowForm(false);
      setEditingCategory(null);
      setForm({ name: "", departmentId: "" });
      loadData();
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่นี้? ตั๋วทั้งหมดที่ใช้หมวดหมู่นี้จะเปลี่ยนเป็นไม่ระบุหมวดหมู่")) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "ลบหมวดหมู่ไม่สำเร็จ");
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
        <p className="text-sm text-gray-500">{categories.length} หมวดหมู่</p>
        <button
          className="btn-primary text-sm flex items-center gap-1"
          onClick={() => {
            setEditingCategory(null);
            setForm({ name: "", departmentId: "" });
            setShowForm(true);
          }}
        >
          <Plus className="w-4 h-4" />
          เพิ่มหมวดหมู่
        </button>
      </div>

      {showForm && (
        <div className="card border-nano-200 bg-nano-50/30">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {editingCategory ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}
          </h3>
          
          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-xl p-3 mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="grid sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="input-label">ชื่อหมวดหมู่ *</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="เช่น ปัญหาคอมพิวเตอร์"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="input-label">แผนกที่สังกัด (ถ้ามี)</label>
              <select
                className="input-field"
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              >
                <option value="">-- ใช้ได้ทุกแผนก (ทั่วไป) --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary text-sm flex-1 flex items-center justify-center gap-1"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingCategory ? "บันทึก" : "เพิ่ม"}
              </button>
              <button
                type="button"
                className="btn-ghost text-sm"
                onClick={() => {
                  setShowForm(false);
                  setEditingCategory(null);
                }}
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card !p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">หมวดหมู่</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">แผนก</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">จำนวน Ticket</th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {cat.department?.name || <span className="text-gray-400">ทั่วไป (ใช้ได้ทุกแผนก)</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {cat._count?.tickets || 0} รายการ
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      setEditingCategory(cat);
                      setForm({ name: cat.name, departmentId: cat.departmentId || "" });
                      setShowForm(true);
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 mr-1"
                    title="แก้ไข"
                  >
                    <Edit className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                    title="ลบ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-10 text-gray-400 text-sm">
                  ยังไม่มีหมวดหมู่ตั๋วในระบบ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
