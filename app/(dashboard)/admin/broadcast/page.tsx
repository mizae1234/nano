"use client";

import { useState, useEffect } from "react";
import { Send, Users, MessageSquare, Loader2, CheckCircle2, AlertTriangle, Info } from "lucide-react";

interface GroupItem {
  id: string;
  lineGroupId: string;
  name: string;
  isActive: boolean;
}

interface UserItem {
  id: string;
  displayName: string;
  lineUid: string | null;
  role: string;
  department: { name: string } | null;
}

export default function BroadcastPage() {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetType, setTargetType] = useState<"GROUP" | "USER">("GROUP");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ successCount: number; failCount: number; errors?: string[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [groupRes, userRes] = await Promise.all([
        fetch("/api/groups").then((r) => r.json()),
        fetch("/api/users").then((r) => r.json()),
      ]);

      setGroups(groupRes.groups?.filter((g: GroupItem) => g.isActive) || []);
      // กรองเฉพาะผู้ใช้ที่มี lineUid เท่านั้น สำหรับการส่ง Broadcast
      setUsers((userRes || []).filter((u: UserItem) => u.lineUid));
    } catch (err) {
      console.error("Failed to load data for broadcast:", err);
      setError("ไม่สามารถโหลดข้อมูลผู้รับได้");
    } finally {
      setLoading(false);
    }
  }

  const handleSelectAll = () => {
    if (targetType === "GROUP") {
      setSelectedIds(groups.map((g) => g.id));
    } else {
      setSelectedIds(users.map((u) => u.id));
    }
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    setError("");
    setResult(null);

    if (!messageText.trim()) {
      setError("กรุณากรอกข้อความที่จะส่ง");
      return;
    }

    if (selectedIds.length === 0) {
      setError("กรุณาเลือกผู้รับอย่างน้อย 1 รายการ");
      return;
    }

    if (!confirm(`ยืนยันการส่งข้อความ Broadcast ไปยังผู้รับจำนวน ${selectedIds.length} รายการใช่ไหม?`)) {
      return;
    }

    setSending(true);

    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageText,
          targetType,
          targetIds: selectedIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการส่งข้อความ");
      }

      setResult({
        successCount: data.successCount,
        failCount: data.failCount,
        errors: data.errors,
      });

      // ล้างข้อมูลหลังส่งเสร็จ
      setMessageText("");
      setSelectedIds([]);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSending(false);
    }
  };

  // เปลี่ยน Tab -> เคลียร์ตัวเลือกเดิม
  const handleTabChange = (type: "GROUP" | "USER") => {
    setTargetType(type);
    setSelectedIds([]);
    setResult(null);
    setError("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-nano-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Send className="w-6 h-6 text-nano-500" />
          Broadcast (ส่งข้อมูล)
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          ส่งข้อความประกาศข่าวสารไปยังกลุ่ม LINE หรือผู้ใช้งานรายบุคคลในระบบโดยตรง
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-xl p-4 border border-red-100 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="card border-emerald-100 bg-emerald-50/20 p-4 space-y-3">
          <h3 className="font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            ดำเนินการส่ง Broadcast เสร็จสิ้น
          </h3>
          <div className="grid grid-cols-2 gap-4 max-w-sm text-sm">
            <div className="bg-white p-3 rounded-lg border border-gray-100">
              <span className="text-gray-400 block text-xs">ส่งสำเร็จ</span>
              <span className="text-lg font-bold text-emerald-600">{result.successCount} รายการ</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-100">
              <span className="text-gray-400 block text-xs">ล้มเหลว</span>
              <span className={`text-lg font-bold ${result.failCount > 0 ? "text-red-500" : "text-gray-400"}`}>
                {result.failCount} รายการ
              </span>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className="mt-3">
              <span className="text-xs font-semibold text-red-600 block mb-1">รายละเอียดรายการที่ล้มเหลว:</span>
              <ul className="text-xs text-red-500 list-disc pl-4 space-y-1">
                {result.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Message Input */}
        <div className="md:col-span-1 space-y-4">
          <div className="card space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">1. พิมพ์ข้อความประกาศ</h3>
            <div>
              <label className="text-xs text-gray-400 block mb-1">เนื้อหาข้อความ LINE</label>
              <textarea
                className="input-field min-h-[180px] text-sm resize-none"
                placeholder="พิมพ์ข้อความที่ต้องการประกาศกระจายข่าวสารที่นี่..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                disabled={sending}
              />
            </div>

            <div className="bg-blue-50/50 rounded-lg p-3 text-xs text-blue-700 border border-blue-100 flex gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>ข้อความจะถูกส่งไปหาปลายทางเสมือนเป็นแชทปกติจาก LINE Official Account ของคุณ</span>
            </div>
          </div>
        </div>

        {/* Right Side: Targets Selection */}
        <div className="md:col-span-2 space-y-4">
          <div className="card flex flex-col min-h-[400px]">
            <h3 className="font-semibold text-gray-900 text-sm px-1 mb-2">2. เลือกเป้าหมายผู้รับ</h3>

            {/* Target tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl gap-1 mb-4">
              <button
                onClick={() => handleTabChange("GROUP")}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  targetType === "GROUP"
                    ? "bg-white text-gray-900 shadow"
                    : "text-gray-500 hover:text-gray-900"
                }`}
                disabled={sending}
              >
                <MessageSquare className="w-4 h-4" />
                กลุ่ม LINE ({groups.length})
              </button>
              <button
                onClick={() => handleTabChange("USER")}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  targetType === "USER"
                    ? "bg-white text-gray-900 shadow"
                    : "text-gray-500 hover:text-gray-900"
                }`}
                disabled={sending}
              >
                <Users className="w-4 h-4" />
                ผู้ใช้ที่มี Line UID ({users.length})
              </button>
            </div>

            {/* Selection utilities */}
            <div className="flex justify-between items-center px-1 mb-3 text-xs">
              <span className="text-gray-500 font-medium">
                เลือกแล้ว <span className="text-nano-600 font-bold">{selectedIds.length}</span> รายการ
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-nano-600 hover:text-nano-700 font-bold hover:underline"
                  disabled={sending}
                >
                  เลือกทั้งหมด
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={handleDeselectAll}
                  className="text-gray-400 hover:text-gray-500 font-bold hover:underline"
                  disabled={sending}
                >
                  ยกเลิกทั้งหมด
                </button>
              </div>
            </div>

            {/* Target List */}
            <div className="flex-1 overflow-y-auto max-h-[320px] border border-gray-100 rounded-xl divide-y divide-gray-50 bg-gray-50/20 px-2 py-1">
              {targetType === "GROUP" ? (
                groups.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs">ไม่มีกลุ่ม LINE ในระบบ</div>
                ) : (
                  groups.map((group) => (
                    <label
                      key={group.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(group.id)}
                        onChange={() => handleToggleSelect(group.id)}
                        className="rounded border-gray-300 text-nano-600 focus:ring-nano-500 w-4 h-4"
                        disabled={sending}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-semibold text-gray-800 block truncate">{group.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono block mt-0.5 truncate">{group.lineGroupId}</span>
                      </div>
                    </label>
                  ))
                )
              ) : users.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs">ไม่มีผู้ใช้ที่มี LINE UID ในระบบ</div>
              ) : (
                users.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(user.id)}
                      onChange={() => handleToggleSelect(user.id)}
                      className="rounded border-gray-300 text-nano-600 focus:ring-nano-500 w-4 h-4"
                      disabled={sending}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-semibold text-gray-800 block truncate">{user.displayName}</span>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                        <span>ฝ่าย: {user.department?.name || "ทั่วไป"}</span>
                        <span>•</span>
                        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">{user.role}</span>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>

            {/* Submit Action */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleSend}
                disabled={sending || selectedIds.length === 0 || !messageText.trim()}
                className="btn-primary flex items-center gap-2 text-sm px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังส่ง Broadcast ({selectedIds.length} รายการ)...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    ส่ง Broadcast ({selectedIds.length} รายการ)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
