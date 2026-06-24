"use client";

import { useState, useEffect } from "react";
import { Users, Search, Shield, Loader2, X, Check, UserPlus } from "lucide-react";

interface MemberItem {
  id: string;
  displayName: string;
  role: string;
  isActive: boolean;
  departmentId: string | null;
  department: { name: string } | null;
}

interface DeptItem {
  id: string;
  name: string;
}

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  USER: { label: "ผู้ใช้งาน", color: "bg-gray-100 text-gray-600" },
  IT: { label: "เจ้าหน้าที่ IT", color: "bg-cyan-100 text-cyan-700" },
  DEPT_ADMIN: { label: "หัวหน้าแผนก", color: "bg-purple-100 text-purple-700" },
  ADMIN: { label: "ผู้ดูแลระบบ", color: "bg-amber-100 text-amber-700" },
  SUPER_ADMIN: { label: "ผู้ดูแลสูงสุด", color: "bg-red-100 text-red-700" },
};

export default function DeptMembersPage() {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [departments, setDepartments] = useState<DeptItem[]>([]);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [deptName, setDeptName] = useState("ทั่วไป");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // States สำหรับ Dialog
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ displayName: "", lineUid: "", role: "USER", departmentId: "" });
  const [submittingInvite, setSubmittingInvite] = useState(false);
  
  const [editingMember, setEditingMember] = useState<MemberItem | null>(null);
  const [editForm, setEditForm] = useState({ role: "", departmentId: "" });
  const [submittingEdit, setSubmittingEdit] = useState(false);
  
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [sessionRes, usersRes, deptsRes] = await Promise.all([
        fetch("/api/session").then((r) => r.json()),
        fetch("/api/users").then((r) => r.json()),
        fetch("/api/departments").then((r) => r.json()),
      ]);

      setSessionUser(sessionRes.user);
      setMembers(Array.isArray(usersRes) ? usersRes : []);
      setDepartments(Array.isArray(deptsRes) ? deptsRes : []);

      const userDeptId = sessionRes.user?.departmentId;
      if (userDeptId && Array.isArray(deptsRes)) {
        const matched = deptsRes.find((d: any) => d.id === userDeptId);
        if (matched) setDeptName(matched.name);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteForm.displayName || !inviteForm.lineUid) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    setError("");
    setSubmittingInvite(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เกิดข้อผิดพลาด");
        setSubmittingInvite(false);
        return;
      }
      setShowInviteModal(false);
      setInviteForm({ displayName: "", lineUid: "", role: "USER", departmentId: "" });
      loadData();
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาด");
    } finally {
      setSubmittingInvite(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMember) return;
    setSubmittingEdit(true);
    try {
      // 1. Update role
      await fetch(`/api/users/${editingMember.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editForm.role }),
      });
      // 2. Update department
      await fetch(`/api/users/${editingMember.id}/department`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId: editForm.departmentId || null }),
      });

      setEditingMember(null);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingEdit(false);
    }
  }

  const filteredMembers = members.filter((m) =>
    m.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-nano-500 animate-spin" />
      </div>
    );
  }

  const isDeptAdmin = ["DEPT_ADMIN", "ADMIN", "SUPER_ADMIN"].includes(sessionUser?.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          สมาชิกในแผนก &quot;{deptName}&quot; ({filteredMembers.length} คน)
        </p>
        {isDeptAdmin && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            เชิญสมาชิก
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="ค้นหาสมาชิก..."
          className="input-field !pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="card !p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">ชื่อ</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">บทบาท</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">แผนก</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">สถานะ</th>
              {isDeptAdmin && (
                <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">จัดการ</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((member) => {
              const role = ROLE_BADGE[member.role] || ROLE_BADGE.USER;
              return (
                <tr key={member.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-nano-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-nano-600">
                          {member.displayName.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{member.displayName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${role.color}`}>{role.label}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {member.department?.name || "ทั่วไป"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${
                        member.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {member.isActive ? "ใช้งาน" : "ปิดใช้งาน"}
                    </span>
                  </td>
                  {isDeptAdmin && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setEditingMember(member);
                          setEditForm({ role: member.role, departmentId: member.departmentId || "" });
                        }}
                        className="text-xs text-nano-500 hover:underline"
                      >
                        แก้ไข
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: Invite User */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-nano-500" />
                เชิญสมาชิกใหม่
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="input-label">ชื่อผู้ใช้งาน</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สมศักดิ์ รักดี"
                  className="input-field"
                  value={inviteForm.displayName}
                  onChange={(e) => setInviteForm({ ...inviteForm, displayName: e.target.value })}
                />
              </div>

              <div>
                <label className="input-label">LINE User ID (สำหรับล็อกอินบอท)</label>
                <input
                  type="text"
                  required
                  placeholder="U1234abcd..."
                  className="input-field"
                  value={inviteForm.lineUid}
                  onChange={(e) => setInviteForm({ ...inviteForm, lineUid: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">บทบาท</label>
                  <select
                    className="input-field"
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  >
                    <option value="USER">ผู้ใช้งาน</option>
                    <option value="IT">เจ้าหน้าที่ IT</option>
                    <option value="DEPT_ADMIN">หัวหน้าแผนก</option>
                    <option value="ADMIN">ผู้ดูแลระบบ</option>
                  </select>
                </div>

                <div>
                  <label className="input-label">แผนก</label>
                  <select
                    className="input-field"
                    value={inviteForm.departmentId}
                    onChange={(e) => setInviteForm({ ...inviteForm, departmentId: e.target.value })}
                  >
                    <option value="">-- แผนกทั่วไป --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="btn-secondary text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submittingInvite}
                  className="btn-primary text-sm flex items-center gap-1"
                >
                  {submittingInvite && <Loader2 className="w-4 h-4 animate-spin" />}
                  เชิญพนักงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Member */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg">แก้ไขสมาชิก: {editingMember.displayName}</h3>
              <button onClick={() => setEditingMember(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="input-label">บทบาท</label>
                <select
                  className="input-field"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                >
                  <option value="USER">ผู้ใช้งาน</option>
                  <option value="IT">เจ้าหน้าที่ IT</option>
                  <option value="DEPT_ADMIN">หัวหน้าแผนก</option>
                  <option value="ADMIN">ผู้ดูแลระบบ</option>
                  {sessionUser?.role === "SUPER_ADMIN" && (
                    <option value="SUPER_ADMIN">ผู้ดูแลสูงสุด</option>
                  )}
                </select>
              </div>

              <div>
                <label className="input-label">แผนก</label>
                <select
                  className="input-field"
                  value={editForm.departmentId}
                  onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                >
                  <option value="">-- ไม่ระบุแผนก (ทั่วไป) --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="btn-secondary text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="btn-primary text-sm flex items-center gap-1"
                >
                  {submittingEdit && <Loader2 className="w-4 h-4 animate-spin" />}
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
