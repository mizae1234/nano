"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Ticket,
  PlusCircle,
  Search,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  Pause,
  Loader2,
} from "lucide-react";

interface TicketItem {
  id: string;
  ticketNo: number;
  title: string;
  status: string;
  priority: string;
  ticketType: string;
  createdAt: string;
  system: { id: string; name: string; icon: string | null; color: string; ticketPrefix: string } | null;
  createdBy: { displayName: string } | null;
  assignedTo: { displayName: string } | null;
  department: { name: string } | null;
  _count: { comments: number };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  OPEN: { label: "เปิด", color: "bg-blue-100 text-blue-700", icon: Circle },
  IN_PROGRESS: { label: "กำลังดำเนินการ", color: "bg-amber-100 text-amber-700", icon: Clock },
  PENDING: { label: "รอข้อมูล", color: "bg-purple-100 text-purple-700", icon: Pause },
  RESOLVED: { label: "แก้ไขแล้ว", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  CLOSED: { label: "ปิด", color: "bg-gray-100 text-gray-600", icon: CheckCircle2 },
};

const TICKET_TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  BUG: { label: "ปัญหาระบบ", icon: "🐛" },
  FEATURE: { label: "ขอฟีเจอร์", icon: "✨" },
  TASK: { label: "งานทั่วไป", icon: "📋" },
  QUESTION: { label: "คำถาม", icon: "❓" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW: { label: "ต่ำ", color: "text-gray-400" },
  MEDIUM: { label: "ปานกลาง", color: "text-blue-500" },
  HIGH: { label: "สูง", color: "text-amber-500" },
  URGENT: { label: "ด่วนมาก", color: "text-red-500" },
};

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/tickets?limit=100")
      .then((res) => res.json())
      .then((data) => {
        setTickets(data.tickets || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    const ticketDisplay = t.system ? `${t.system.ticketPrefix}-${t.ticketNo}` : `#${t.ticketNo}`;
    if (
      searchQuery &&
      !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !ticketDisplay.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "OPEN").length,
    inProgress: tickets.filter((t) => t.status === "IN_PROGRESS").length,
    resolved: tickets.filter((t) => t.status === "RESOLVED").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-nano-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "ทั้งหมด", value: stats.total, color: "bg-nano-50 text-nano-600 border-nano-100" },
          { label: "เปิดอยู่", value: stats.open, color: "bg-blue-50 text-blue-600 border-blue-100" },
          { label: "กำลังดำเนินการ", value: stats.inProgress, color: "bg-amber-50 text-amber-600 border-amber-100" },
          { label: "แก้ไขแล้ว", value: stats.resolved, color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-2xl border p-4 ${stat.color}`}>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm opacity-80">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหา Ticket..."
            className="input-field !pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            className="input-field !w-auto text-sm flex-1 sm:flex-initial"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">ทุกสถานะ</option>
            <option value="OPEN">เปิด</option>
            <option value="IN_PROGRESS">กำลังดำเนินการ</option>
            <option value="PENDING">รอข้อมูล</option>
            <option value="RESOLVED">แก้ไขแล้ว</option>
            <option value="CLOSED">ปิด</option>
          </select>

          <Link href="/ticket/new" className="btn-primary text-sm whitespace-nowrap">
            <PlusCircle className="w-4 h-4 mr-1.5" />
            แจ้งปัญหาใหม่
          </Link>
        </div>
      </div>

      {/* Ticket List */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <div className="card text-center py-16">
            <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">ไม่มี Ticket</h3>
            <p className="text-sm text-gray-400 mb-6">ยังไม่มี Ticket ในขณะนี้</p>
            <Link href="/ticket/new" className="btn-primary">
              <PlusCircle className="w-4 h-4 mr-1.5" />
              แจ้งปัญหาใหม่
            </Link>
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const statusInfo = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;
            const priorityInfo = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.MEDIUM;
            const typeInfo = TICKET_TYPE_CONFIG[ticket.ticketType] || TICKET_TYPE_CONFIG.BUG;
            const StatusIcon = statusInfo.icon;
            const ticketDisplay = ticket.system
              ? `${ticket.system.ticketPrefix}-${ticket.ticketNo}`
              : `#${ticket.ticketNo}`;

            return (
              <Link
                key={ticket.id}
                href={`/ticket/${ticket.id}`}
                className="card-hover flex items-center gap-4 !p-4 group"
              >
                <div className={`shrink-0 ${priorityInfo.color}`}>
                  <StatusIcon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className="text-sm font-mono font-bold"
                      style={{ color: ticket.system?.color || "#0066FF" }}
                    >
                      {ticketDisplay}
                    </span>
                    {ticket.system && (
                      <span
                        className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${ticket.system.color}15`,
                          color: ticket.system.color,
                        }}
                      >
                        {ticket.system.icon || "⚙️"} {ticket.system.name}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {typeInfo.icon} {typeInfo.label}
                    </span>
                    <span className={`badge ${statusInfo.color} text-[10px]`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {ticket.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{ticket.department?.name || "ทั่วไป"}</span>
                    <span>•</span>
                    <span>
                      {new Date(ticket.createdAt).toLocaleDateString("th-TH", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {ticket.assignedTo && (
                      <>
                        <span>•</span>
                        <span>🔧 {ticket.assignedTo.displayName}</span>
                      </>
                    )}
                    {ticket._count.comments > 0 && (
                      <>
                        <span>•</span>
                        <span>💬 {ticket._count.comments}</span>
                      </>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-nano-500 transition-colors shrink-0" />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
