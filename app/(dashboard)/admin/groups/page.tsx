"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Loader2, Check, X, Trash2, Pencil } from "lucide-react";

interface SystemInfo {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  color: string;
}

interface GroupItem {
  id: string;
  lineGroupId: string;
  name: string;
  isActive: boolean;
  groupSystems: {
    system: SystemInfo;
  }[];
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [systems, setSystems] = useState<SystemInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGroup, setEditingGroup] = useState<GroupItem | null>(null);
  const [editForm, setEditForm] = useState({ name: "", systemIds: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [groupRes, sysRes] = await Promise.all([
      fetch("/api/groups").then((r) => r.json()),
      fetch("/api/systems").then((r) => r.json()),
    ]);
    setGroups(groupRes.groups || []);
    setSystems(sysRes.systems?.filter((s: SystemInfo & { isActive: boolean }) => s.isActive) || []);
    setLoading(false);
  }

  async function handleUpdate() {
    if (!editingGroup) return;
    setError("");
    if (!editForm.name) {
      setError("กรุณากรอกชื่อกลุ่ม");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/groups/${editingGroup.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        systemIds: editForm.systemIds,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "เกิดข้อผิดพลาดในการอัปเดต");
      setSaving(false);
      return;
    }
    setEditingGroup(null);
    setSaving(false);
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("ต้องการลบ Group นี้ใช่ไหม?")) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    loadData();
  }

  function toggleEditSystem(sysId: string) {
    setEditForm((prev) => ({
      ...prev,
      systemIds: prev.systemIds.includes(sysId)
        ? prev.systemIds.filter((id) => id !== sysId)
        : [...prev.systemIds, sysId],
    }));
  }

  function startEdit(group: GroupItem) {
    setEditingGroup(group);
    setEditForm({
      name: group.name,
      systemIds: group.groupSystems.map((gs) => gs.system.id),
    });
    setError("");
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
            <MessageSquare className="w-5 h-5 text-nano-500" />
            จัดการ LINE Group
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Config LINE Group ↔ ระบบ — Group ที่ผูก 1 ระบบ บอทจะรู้เองอัตโนมัติ | ผูกหลายระบบ บอทจะถาม | ไม่ผูกระบบก็ได้
          </p>
        </div>
      </div>

      {/* Edit Form */}
      {editingGroup && (
        <div className="card border-amber-200 bg-amber-50/20">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Pencil className="w-4 h-4 text-amber-600" />
            แก้ไข LINE Group: <span className="font-mono text-sm text-gray-500">{editingGroup.lineGroupId}</span>
          </h3>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-4">{error}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">ชื่อ Group</label>
              <input
                className="input-field mt-1"
                placeholder="เช่น Support Saran Jeans"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 opacity-60">LINE Group ID (แก้ไขไม่ได้)</label>
              <input
                className="input-field mt-1 bg-gray-100 cursor-not-allowed opacity-60"
                value={editingGroup.lineGroupId}
                disabled
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700">ผูกกับระบบ (เลือกได้หลายระบบ หรือไม่ระบุก็ได้)</label>
            <p className="text-[10px] text-gray-400 mb-2">
              ผูก 1 ระบบ = บอทรู้เองอัตโนมัติ | ผูกหลายระบบ = บอทจะถาม | ไม่เลือก/ติ๊กออกทั้งหมด = ยกเลิกการผูกระบบ
            </p>
            <div className="flex flex-wrap gap-2">
              {systems.map((sys) => (
                <button
                  key={sys.id}
                  type="button"
                  onClick={() => toggleEditSystem(sys.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-all ${
                    editForm.systemIds.includes(sys.id)
                      ? "border-transparent text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                  style={
                    editForm.systemIds.includes(sys.id)
                      ? { backgroundColor: sys.color }
                      : undefined
                  }
                >
                  {sys.icon || "⚙️"} {sys.name}
                  {editForm.systemIds.includes(sys.id) && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleUpdate}
              disabled={saving}
              className="btn-primary flex items-center gap-2 !bg-amber-600 hover:!bg-amber-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              บันทึกการแก้ไข
            </button>
            <button
              onClick={() => setEditingGroup(null)}
              className="btn-secondary"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Group List */}
      <div className="space-y-3">
        {groups.map((group) => (
          <div
            key={group.id}
            className={`card flex items-center gap-4 ${!group.isActive ? "opacity-50" : ""} ${
              editingGroup?.id === group.id ? "ring-2 ring-amber-500" : ""
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-nano-50 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-nano-500" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900">{group.name}</div>
              <div className="text-xs text-gray-400 font-mono truncate">
                {group.lineGroupId}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {group.groupSystems.length === 0 ? (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">ยังไม่ได้ผูกระบบ</span>
              ) : (
                group.groupSystems.map((gs) => (
                  <span
                    key={gs.system.id}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium"
                    style={{
                      backgroundColor: `${gs.system.color}15`,
                      color: gs.system.color,
                    }}
                  >
                    {gs.system.icon || "⚙️"} {gs.system.name}
                  </span>
                ))
              )}
            </div>

            <div className="flex items-center gap-1">
              {group.groupSystems.length === 1 && (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                  auto
                </span>
              )}
              {group.groupSystems.length > 1 && (
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  ถาม
                </span>
              )}
              <button
                onClick={() => startEdit(group)}
                className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                title="แก้ไขกลุ่ม"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(group.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                title="ลบกลุ่ม"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">ยังไม่มี LINE Group</p>
        </div>
      )}
    </div>
  );
}
