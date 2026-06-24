"use client";

import { useState, useEffect } from "react";
import { Users, Search, Shield, Loader2, X } from "lucide-react";

interface UserItem {
  id: string;
  displayName: string;
  role: string;
  isActive: boolean;
  departmentId: string | null;
  department: { name: string } | null;
  _count: { createdTickets: number; assignedTickets: number };
}

interface DeptItem {
  id: string;
  name: string;
}

const ROLE: Record<string, { label: string; color: string }> = {
  USER: { label: "ผู้ใช้งาน", color: "bg-gray-100 text-gray-600" },
  IT: { label: "เจ้าหน้าที่ IT", color: "bg-cyan-100 text-cyan-700" },
  DEPT_ADMIN: { label: "หัวหน้าแผนก", color: "bg-purple-100 text-purple-700" },
  ADMIN: { label: "ผู้ดูแลระบบ", color: "bg-amber-100 text-amber-700" },
  SUPER_ADMIN: { label: "ผู้ดูแลสูงสุด", color: "bg-red-100 text-red-700" },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [departments, setDepartments] = useState<DeptItem[]>([]);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // States สำหรับ Dialogs
  const [editingRoleUser, setEditingRoleUser] = useState<UserItem | null>(null);
  const [editingDeptUser, setEditingDeptUser] = useState<UserItem | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [sessRes, usersRes, deptsRes] = await Promise.all([
        fetch("/api/session").then((r) => r.json()),
        fetch("/api/users").then((r) => r.json()),
        fetch("/api/departments").then((r) => r.json()),
      ]);
      setSessionUser(sessRes.user);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setDepartments(Array.isArray(deptsRes) ? deptsRes : []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  async function handleUpdateRole(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRoleUser) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/users/${editingRoleUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });
      if (res.ok) {
        setEditingRoleUser(null);
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  }

  async function handleUpdateDept(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDeptUser) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/users/${editingDeptUser.id}/department`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId: selectedDeptId || null }),
      });
      if (res.ok) {
        setEditingDeptUser(null);
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  }

  const filteredUsers = users.filter((u) =>
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <p className="text-sm text-gray-500">ผู้ใช้ทั้งหมด {users.length} คน</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="ค้นหาผู้ใช้..."
          className="input-field !pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">ชื่อ</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">บทบาท</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">แผนก</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Ticket</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">สถานะ</th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const role = ROLE[user.role] || ROLE.USER;
              return (
                <tr key={user.id} className="border-b border-gray-55 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-nano-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-nano-600">
                          {user.displayName.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{user.displayName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${role.color}`}>{role.label}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {user.department?.name || <span className="text-gray-400">ยังไม่ได้สังกัด</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span>แจ้ง: {user._count.createdTickets}</span>
                    {["IT", "DEPT_ADMIN", "ADMIN", "SUPER_ADMIN"].includes(user.role) && (
                      <span className="ml-2 text-gray-400">| ช่าง: {user._count.assignedTickets}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${
                        user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {user.isActive ? "ใช้งาน" : "ปิด"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      onClick={() => {
                        setEditingRoleUser(user);
                        setSelectedRole(user.role);
                      }}
                      className="text-xs text-nano-500 hover:underline mr-3"
                    >
                      เปลี่ยน Role
                    </button>
                    <button
                      onClick={() => {
                        setEditingDeptUser(user);
                        setSelectedDeptId(user.departmentId || "");
                      }}
                      className="text-xs text-nano-500 hover:underline"
                    >
                      เปลี่ยนแผนก
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: Edit Role */}
      {editingRoleUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl animate-scale-in">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900">เปลี่ยนบทบาท: {editingRoleUser.displayName}</h3>
              <button onClick={() => setEditingRoleUser(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div>
                <label className="input-label">เลือกบทบาท</label>
                <select
                  className="input-field"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="USER">ผู้ใช้งาน (USER)</option>
                  <option value="IT">เจ้าหน้าที่ IT (IT)</option>
                  <option value="DEPT_ADMIN">หัวหน้าแผนก (DEPT_ADMIN)</option>
                  <option value="ADMIN">ผู้ดูแลระบบ (ADMIN)</option>
                  {sessionUser?.role === "SUPER_ADMIN" && (
                    <option value="SUPER_ADMIN">ผู้ดูแลสูงสุด (SUPER_ADMIN)</option>
                  )}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setEditingRoleUser(null)} className="btn-secondary text-sm">
                  ยกเลิก
                </button>
                <button type="submit" disabled={updating} className="btn-primary text-sm flex items-center gap-1">
                  {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Dept */}
      {editingDeptUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl animate-scale-in">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900">เปลี่ยนแผนก: {editingDeptUser.displayName}</h3>
              <button onClick={() => setEditingDeptUser(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleUpdateDept} className="space-y-4">
              <div>
                <label className="input-label">เลือกแผนก</label>
                <select
                  className="input-field"
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                >
                  <option value="">-- ยังไม่ได้สังกัด (แผนกทั่วไป) --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setEditingDeptUser(null)} className="btn-secondary text-sm">
                  ยกเลิก
                </button>
                <button type="submit" disabled={updating} className="btn-primary text-sm flex items-center gap-1">
                  {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
