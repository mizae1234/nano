"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  User,
  Building2,
  Tag,
  Send,
  CheckCircle2,
  Circle,
  Pause,
  AlertCircle,
  MessageSquare,
  History,
  Loader2,
  AlertTriangle,
  Image,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";

interface CommentItem {
  id: string;
  message: string;
  createdAt: string;
  user: {
    displayName: string;
    pictureUrl: string | null;
    role: string;
  };
}

interface AuditLogItem {
  id: string;
  action: string;
  detail: string | null;
  createdAt: string;
  user: {
    displayName: string;
  };
}

interface TicketDetail {
  id: string;
  ticketNo: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  ticketType: string;
  createdAt: string;
  createdBy: { id: string; displayName: string; pictureUrl: string | null };
  assignedTo: { id: string; displayName: string; pictureUrl: string | null } | null;
  department: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  system: { id: string; name: string; color: string; ticketPrefix: string } | null;
  comments: CommentItem[];
  auditLogs: AuditLogItem[];
  images?: string[];
  notifyOnResolve: boolean;
  notifyChannel: string;
  notifyGroupId: string | null;
  assignedToId?: string | null;
  departmentId?: string | null;
  categoryId?: string | null;
  dueDate?: string | null;
}

interface UserItem {
  id: string;
  displayName: string;
  role: string;
}

interface DeptItem {
  id: string;
  name: string;
}

interface CategoryItem {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: "OPEN", label: "เปิด", color: "bg-blue-100 text-blue-700" },
  { value: "IN_PROGRESS", label: "กำลังดำเนินการ", color: "bg-amber-100 text-amber-700" },
  { value: "PENDING", label: "รอข้อมูล", color: "bg-purple-100 text-purple-700" },
  { value: "RESOLVED", label: "แก้ไขแล้ว", color: "bg-emerald-100 text-emerald-700" },
  { value: "CLOSED", label: "ปิด", color: "bg-gray-100 text-gray-600" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "ต่ำ", color: "bg-gray-100 text-gray-600" },
  { value: "MEDIUM", label: "ปานกลาง", color: "bg-blue-100 text-blue-700" },
  { value: "HIGH", label: "สูง", color: "bg-amber-100 text-amber-700" },
  { value: "URGENT", label: "ด่วนมาก", color: "bg-red-100 text-red-700" },
];

const TICKET_TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  BUG: { label: "ปัญหาระบบ", icon: "🐛" },
  FEATURE: { label: "ขอฟีเจอร์", icon: "✨" },
  TASK: { label: "งานทั่วไป", icon: "📋" },
  QUESTION: { label: "คำถาม", icon: "❓" },
};

export default function TicketDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newComment, setNewComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"comments" | "history">("comments");

  // แหล่งข้อมูลสำหรับเปลี่ยนค่า (สำหรับผู้ใช้ IT+)
  const [users, setUsers] = useState<UserItem[]>([]);
  const [departments, setDepartments] = useState<DeptItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [updating, setUpdating] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // ติดตามตั๋ว (Follower settings)
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerNotifyChannel, setFollowerNotifyChannel] = useState("DIRECT");
  const [followerNotifyGroupId, setFollowerNotifyGroupId] = useState<string | null>(null);
  const [followUpdating, setFollowUpdating] = useState(false);

  useEffect(() => {
    loadSessionAndTicket();
  }, [id]);

  async function loadSessionAndTicket() {
    try {
      const [sessionRes, ticketRes] = await Promise.all([
        fetch("/api/session").then((r) => r.json()),
        fetch(`/api/tickets/${id}`).then((r) => r.json()),
      ]);

      if (ticketRes.error) {
        setError(ticketRes.error);
        setLoading(false);
        return;
      }

      setTicket(ticketRes);
      setSessionUser(sessionRes.user);

      // ถ้าเป็น IT+ ให้ดึงข้อมูลผู้ใช้ แผนก และหมวดหมู่เพิ่มเติมเผื่อแก้ไข
      const isIT = ["IT", "DEPT_ADMIN", "ADMIN", "SUPER_ADMIN"].includes(sessionRes.user?.role);
      if (isIT) {
        const [usersRes, deptRes] = await Promise.all([
          fetch("/api/users").then((r) => r.json()),
          fetch("/api/departments").then((r) => r.json()),
        ]);
        setUsers(usersRes || []);
        setDepartments(deptRes || []);

        const catRes = await fetch(`/api/categories?departmentId=${ticketRes.departmentId || ""}`).then((r) => r.json());
        setCategories(catRes || []);
      }

      // โหลดรายชื่อกลุ่มไลน์เสมอ เพื่อนำมาเลือกเป็นช่องทางการแจ้งเตือน
      const groupsRes = await fetch("/api/groups").then((r) => r.json()).catch(() => []);
      setGroups(groupsRes.groups || groupsRes || []);

      // โหลดสถานะการติดตามของตนเอง
      const followRes = await fetch(`/api/tickets/${id}/follow`).then((r) => r.json()).catch(() => ({}));
      setIsFollowing(followRes.isFollowing || false);
      setFollowerNotifyChannel(followRes.notifyChannel || "DIRECT");
      setFollowerNotifyGroupId(followRes.notifyGroupId || null);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      setLoading(false);
    }
  }

  async function handleToggleFollow(updatedIsFollowing: boolean) {
    setFollowUpdating(true);
    try {
      const res = await fetch(`/api/tickets/${id}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isFollowing: updatedIsFollowing,
          notifyChannel: followerNotifyChannel,
          notifyGroupId: followerNotifyGroupId,
        }),
      }).then((r) => r.json());

      setIsFollowing(res.isFollowing);
      if (res.isFollowing) {
        setFollowerNotifyChannel(res.notifyChannel || "DIRECT");
        setFollowerNotifyGroupId(res.notifyGroupId || null);
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
    } finally {
      setFollowUpdating(false);
    }
  }

  async function handleUpdateFollowSettings(channel: string, groupId: string | null) {
    setFollowUpdating(true);
    try {
      const res = await fetch(`/api/tickets/${id}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isFollowing: true,
          notifyChannel: channel,
          notifyGroupId: groupId,
        }),
      }).then((r) => r.json());

      setIsFollowing(res.isFollowing);
      setFollowerNotifyChannel(res.notifyChannel || "DIRECT");
      setFollowerNotifyGroupId(res.notifyGroupId || null);
    } catch (err) {
      console.error("Error updating follow settings:", err);
    } finally {
      setFollowUpdating(false);
    }
  }

  // โหลดหมวดหมู่ตามแผนกเมื่อมีการเลือกแผนกใหม่
  async function loadCategoriesForDept(deptId: string | null) {
    const catRes = await fetch(`/api/categories?departmentId=${deptId || ""}`).then((r) => r.json());
    setCategories(catRes || []);
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentSubmitting(true);
    try {
      const res = await fetch(`/api/tickets/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newComment }),
      });
      if (res.ok) {
        setNewComment("");
        // Reload ticket to see new comment
        const updatedTicket = await fetch(`/api/tickets/${id}`).then((r) => r.json());
        setTicket(updatedTicket);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function handleUpdateField(fieldName: string, value: any) {
    setUpdating(true);
    try {
      const payload: Record<string, any> = { [fieldName]: value };
      
      // ถ้าเปลี่ยนแผนก ให้รีเซ็ตหมวดหมู่เป็น null ก่อน
      if (fieldName === "departmentId") {
        payload.categoryId = null;
        await loadCategoriesForDept(value);
      }

      const res = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updatedTicket = await fetch(`/api/tickets/${id}`).then((r) => r.json());
        setTicket(updatedTicket);
      } else {
        const data = await res.json();
        alert(data.error || "เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
      }
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถอัปเดตข้อมูลได้");
    } finally {
      setUpdating(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("กรุณาเลือกไฟล์รูปภาพเท่านั้นค่ะ");
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("ticketId", id as string);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "อัปโหลดรูปล้มเหลว");
      }

      const uploadResult = await res.json();
      const newImageUrl = uploadResult.url;

      const currentImages = ticket?.images || [];
      const updatedImages = [...currentImages, newImageUrl];

      await handleUpdateField("images", updatedImages);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleRemoveImage(indexToRemove: number) {
    if (!confirm("คุณต้องการลบรูปภาพแนบนี้ใช่หรือไม่คะ?")) return;

    try {
      const currentImages = ticket?.images || [];
      const updatedImages = currentImages.filter((_, idx) => idx !== indexToRemove);

      await handleUpdateField("images", updatedImages);
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการลบรูปภาพ");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-nano-500 animate-spin" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="card text-center py-10 border-red-100 bg-red-50/20">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-700 mb-2">ไม่สามารถเข้าถึง Ticket ได้</h3>
          <p className="text-sm text-gray-500 mb-6">{error || "เกิดข้อผิดพลาดที่ไม่รู้จัก"}</p>
          <Link href="/ticket" className="btn-primary">
            กลับหน้าแรก
          </Link>
        </div>
      </div>
    );
  }

  const isIT = ["IT", "DEPT_ADMIN", "ADMIN", "SUPER_ADMIN"].includes(sessionUser?.role);
  const isCreator = sessionUser?.id === ticket.createdBy.id;
  const statusInfo = STATUS_OPTIONS.find((s) => s.value === ticket.status) || STATUS_OPTIONS[0];
  const priorityInfo = PRIORITY_OPTIONS.find((p) => p.value === ticket.priority) || PRIORITY_OPTIONS[0];
  const typeInfo = TICKET_TYPE_CONFIG[ticket.ticketType] || TICKET_TYPE_CONFIG.BUG;
  const ticketDisplay = ticket.system
    ? `#${ticket.system.ticketPrefix}-${ticket.ticketNo}`
    : `#${ticket.ticketNo}`;

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/ticket" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        กลับรายการ Ticket
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="card relative overflow-hidden">
            {/* System stripe */}
            {ticket.system && (
              <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: ticket.system.color }} />
            )}
            
            <div className="flex items-start justify-between mb-4 mt-2">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className="text-lg font-mono font-bold"
                    style={{ color: ticket.system?.color || "#0066FF" }}
                  >
                    {ticketDisplay}
                  </span>
                  {ticket.system && (
                    <span
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${ticket.system.color}15`,
                        color: ticket.system.color,
                      }}
                    >
                      {ticket.system.name}
                    </span>
                  )}
                  <span className="text-sm text-gray-500">
                    {typeInfo.icon} {typeInfo.label}
                  </span>
                  <span className={`badge ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">{ticket.title}</h1>
              </div>
            </div>

            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {ticket.description}
            </p>

            {/* รูปภาพแนบเพิ่มเติม */}
            {ticket.images && ticket.images.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="text-xs font-semibold text-gray-400 mb-2">รูปภาพแนบเพิ่มเติม ({ticket.images.length})</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ticket.images.map((url, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-video bg-gray-50">
                      <img
                        src={url}
                        alt={`Attachment ${idx + 1}`}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                        onClick={() => window.open(url, "_blank")}
                      />
                      {(isIT || isCreator) && (
                        <button
                          type="button"
                          className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                          onClick={() => handleRemoveImage(idx)}
                          title="ลบรูปภาพ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* แนบรูปภาพเพิ่มเติม */}
            {(isIT || isCreator) && (
              <div className="mt-4 flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium cursor-pointer transition-all">
                  <Image className="w-3.5 h-3.5 text-gray-500" />
                  <span>แนบรูปภาพเพิ่มเติม</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </label>
                {uploadingImage && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    กำลังอัปโหลด...
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                ผู้แจ้ง: {ticket.createdBy.displayName}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                เมื่อ: {new Date(ticket.createdAt).toLocaleString("th-TH")}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
              <button
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "comments" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                }`}
                onClick={() => setActiveTab("comments")}
              >
                <MessageSquare className="w-4 h-4" />
                ความคิดเห็น ({ticket.comments.length})
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "history" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                }`}
                onClick={() => setActiveTab("history")}
              >
                <History className="w-4 h-4" />
                ประวัติ ({ticket.auditLogs.length})
              </button>
            </div>

            {activeTab === "comments" ? (
              <div className="space-y-4">
                {ticket.comments.map((comment) => (
                  <div key={comment.id} className="card !p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-nano-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-nano-600">
                            {comment.user.displayName.charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {comment.user.displayName}
                        </span>
                        {["IT", "DEPT_ADMIN", "ADMIN", "SUPER_ADMIN"].includes(comment.user.role) && (
                          <span className="badge bg-cyan-100 text-cyan-700 text-[10px]">
                            {comment.user.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : comment.user.role}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.createdAt).toLocaleString("th-TH", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 pl-9 whitespace-pre-wrap">{comment.message}</p>
                  </div>
                ))}

                {/* Add Comment */}
                <form onSubmit={handleAddComment} className="card !p-4">
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-nano-100 flex items-center justify-center shrink-0 mt-1">
                      <span className="text-xs font-bold text-nano-600">
                        {sessionUser?.displayName?.charAt(0) || "U"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <textarea
                        className="input-field !min-h-[80px] resize-y"
                        placeholder="พิมพ์ความคิดเห็น..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        required
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          type="submit"
                          className="btn-primary text-sm"
                          disabled={commentSubmitting || !newComment.trim()}
                        >
                          {commentSubmitting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          ส่งความคิดเห็น
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <div className="card !p-4">
                <div className="space-y-4">
                  {ticket.auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-nano-300 mt-2 shrink-0" />
                      <div>
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">{log.user?.displayName || "ระบบ"}</span> — {log.detail}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(log.createdAt).toLocaleString("th-TH")}
                        </div>
                      </div>
                    </div>
                  ))}
                  {ticket.auditLogs.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">ไม่มีประวัติการดำเนินการ</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status (สำหรับ IT+ หรือผู้สร้างปิดตั๋วได้) */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">สถานะ</h3>
            {isIT ? (
              <select
                className="input-field text-sm"
                value={ticket.status}
                onChange={(e) => handleUpdateField("status", e.target.value)}
                disabled={updating}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            ) : (
              <div className="space-y-3">
                <span className={`badge ${statusInfo.color} block text-center py-1.5 text-sm w-full font-semibold`}>
                  {statusInfo.label}
                </span>

                {sessionUser?.id === ticket.createdBy.id && ticket.status !== "CLOSED" && (
                  <button
                    onClick={() => {
                      if (confirm("คุณต้องการปิดตั๋วงานนี้ใช่หรือไม่?")) {
                        handleUpdateField("status", "CLOSED");
                      }
                    }}
                    disabled={updating}
                    className="w-full btn-danger text-xs py-2 flex items-center justify-center gap-1.5 shadow-sm hover:shadow transition-all font-semibold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ปิดตั๋วงาน (Close Ticket)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">รายละเอียด</h3>

            {/* Priority */}
            <div>
              <div className="text-xs text-gray-400 mb-1">ลำดับความสำคัญ</div>
              {isIT ? (
                <select
                  className="input-field text-sm !py-1"
                  value={ticket.priority}
                  onChange={(e) => handleUpdateField("priority", e.target.value)}
                  disabled={updating}
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              ) : (
                <span className={`badge ${priorityInfo.color}`}>
                  {priorityInfo.label}
                </span>
              )}
            </div>

            {/* Department */}
            <div>
              <div className="text-xs text-gray-400 mb-1">แผนกผู้รับผิดชอบ</div>
              {isIT ? (
                <select
                  className="input-field text-sm !py-1"
                  value={ticket.departmentId || ""}
                  onChange={(e) => handleUpdateField("departmentId", e.target.value || null)}
                  disabled={updating}
                >
                  <option value="">-- ไม่ระบุแผนก --</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  {ticket.department?.name || "ทั่วไป / ไม่ระบุ"}
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <div className="text-xs text-gray-400 mb-1">หมวดหมู่</div>
              {isIT ? (
                <select
                  className="input-field text-sm !py-1"
                  value={ticket.categoryId || ""}
                  onChange={(e) => handleUpdateField("categoryId", e.target.value || null)}
                  disabled={updating}
                >
                  <option value="">-- เลือกหมวดหมู่ --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <Tag className="w-3.5 h-3.5 text-gray-400" />
                  {ticket.category?.name || "ไม่ระบุหมวดหมู่"}
                </div>
              )}
            </div>

            {/* Assignee */}
            <div>
              <div className="text-xs text-gray-400 mb-1">ผู้รับผิดชอบ</div>
              {isIT ? (
                <select
                  className="input-field text-sm !py-1"
                  value={ticket.assignedToId || ""}
                  onChange={(e) => handleUpdateField("assignedToId", e.target.value || null)}
                  disabled={updating}
                >
                  <option value="">-- ยังไม่ได้มอบหมาย --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.displayName} ({u.role})</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  {ticket.assignedTo?.displayName || "ยังไม่ได้มอบหมาย"}
                </div>
              )}
            </div>

            {/* Due Date */}
            <div>
              <div className="text-xs text-gray-400 mb-1">วันกำหนดส่ง (Due Date)</div>
              {isIT ? (
                <input
                  type="date"
                  className="input-field text-sm !py-1"
                  value={ticket.dueDate ? new Date(ticket.dueDate).toISOString().substring(0, 10) : ""}
                  onChange={(e) => handleUpdateField("dueDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
                  disabled={updating}
                />
              ) : (
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString("th-TH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }) : "ไม่ได้ระบุ"}
                </div>
              )}
            </div>
          </div>

          {/* Notification Settings */}
          <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">ตั้งค่าการแจ้งเตือน</h3>
            
            {/* Notify on Resolve Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-550">แจ้งเตือนเมื่อแก้ไขแล้ว</span>
              {(isIT || sessionUser?.id === ticket.createdBy.id) ? (
                <input
                  type="checkbox"
                  className="w-4 h-4 text-nano-600 border-gray-300 rounded focus:ring-nano-500 cursor-pointer"
                  checked={ticket.notifyOnResolve}
                  onChange={(e) => handleUpdateField("notifyOnResolve", e.target.checked)}
                  disabled={updating}
                />
              ) : (
                <span className="text-xs font-semibold text-gray-700">
                  {ticket.notifyOnResolve ? "เปิด" : "ปิด"}
                </span>
              )}
            </div>

            {ticket.notifyOnResolve && (
              <>
                {/* Notify Channel */}
                <div>
                  <div className="text-xs text-gray-400 mb-1">ช่องทางแจ้งเตือน</div>
                  {(isIT || sessionUser?.id === ticket.createdBy.id) ? (
                    <select
                      className="input-field text-sm !py-1"
                      value={ticket.notifyChannel}
                      onChange={(e) => handleUpdateField("notifyChannel", e.target.value)}
                      disabled={updating}
                    >
                      <option value="DIRECT">LINE ส่วนตัวของผู้แจ้ง</option>
                      <option value="GROUP">LINE Group</option>
                      <option value="NONE">ไม่แจ้งเตือน</option>
                    </select>
                  ) : (
                    <span className="text-sm text-gray-700">
                      {ticket.notifyChannel === "DIRECT" && "LINE ส่วนตัวของผู้แจ้ง"}
                      {ticket.notifyChannel === "GROUP" && "LINE Group"}
                      {ticket.notifyChannel === "NONE" && "ไม่แจ้งเตือน"}
                    </span>
                  )}
                </div>

                {/* Group Selection */}
                {ticket.notifyChannel === "GROUP" && (
                  <div>
                    <div className="text-xs text-gray-400 mb-1">เลือกกลุ่มไลน์</div>
                    {(isIT || sessionUser?.id === ticket.createdBy.id) ? (
                      <select
                        className="input-field text-sm !py-1"
                        value={ticket.notifyGroupId || ""}
                        onChange={(e) => handleUpdateField("notifyGroupId", e.target.value || null)}
                        disabled={updating}
                      >
                        <option value="">-- เลือกกลุ่มไลน์ --</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-gray-750">
                        {groups.find((g) => g.id === ticket.notifyGroupId)?.name || "ไม่ได้ระบุกลุ่ม"}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Follow Settings Card */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">ติดตามตั๋วใบนี้</h3>
              {isFollowing && (
                <span className="inline-flex items-center gap-1 text-xs text-nano-600 bg-nano-50 px-2 py-0.5 rounded-full font-medium">
                  <Eye className="w-3.5 h-3.5" />
                  กำลังติดตาม
                </span>
              )}
            </div>
            
            <p className="text-xs text-gray-500">
              เมื่อติดตามตั๋วใบนี้ ระบบจะส่งการแจ้งเตือน LINE Flex Message ให้คุณเมื่อมีข้อมูลหรือสถานะอัปเดต
            </p>

            <button
              onClick={() => handleToggleFollow(!isFollowing)}
              disabled={followUpdating}
              className={`w-full text-xs py-2 flex items-center justify-center gap-1.5 shadow-sm hover:shadow transition-all font-semibold rounded-md ${
                isFollowing
                  ? "bg-red-50 text-red-650 border border-red-200 hover:bg-red-100"
                  : "btn-primary"
              }`}
            >
              {followUpdating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isFollowing ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  ยกเลิกติดตามตั๋ว (Unfollow)
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  ติดตามตั๋วใบนี้ (Follow)
                </>
              )}
            </button>

            {isFollowing && (
              <div className="space-y-3 pt-2 border-t border-gray-150">
                {/* Notify Channel Selection */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">ช่องทางการแจ้งเตือน</label>
                  <select
                    className="input-field text-sm !py-1"
                    value={followerNotifyChannel}
                    onChange={(e) => handleUpdateFollowSettings(e.target.value, followerNotifyGroupId)}
                    disabled={followUpdating}
                  >
                    <option value="DIRECT">LINE ส่วนตัว (Direct Message)</option>
                    <option value="GROUP">LINE Group</option>
                  </select>
                </div>

                {/* Group Selection */}
                {followerNotifyChannel === "GROUP" && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">เลือกกลุ่มไลน์สำหรับแจ้งเตือน</label>
                    <select
                      className="input-field text-sm !py-1"
                      value={followerNotifyGroupId || ""}
                      onChange={(e) => handleUpdateFollowSettings(followerNotifyChannel, e.target.value || null)}
                      disabled={followUpdating}
                    >
                      <option value="">-- เลือกกลุ่มไลน์ --</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
// Add custom field support for backward compatibility with schema
// (Interface merged above)
