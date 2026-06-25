"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  PlusCircle, Search, LayoutList, Columns, Loader2,
  Clock, CheckCircle2, Circle, Pause, XCircle, MessageSquare,
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

const COLUMNS = [
  { key: "OPEN",        label: "เปิด",             icon: Circle,       color: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE" },
  { key: "IN_PROGRESS", label: "กำลังดำเนินการ",   icon: Clock,        color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  { key: "PENDING",     label: "รอข้อมูล",          icon: Pause,        color: "#8B5CF6", bg: "#F5F3FF", border: "#DDD6FE" },
  { key: "RESOLVED",    label: "แก้ไขแล้ว",         icon: CheckCircle2, color: "#10B981", bg: "#ECFDF5", border: "#A7F3D0" },
  { key: "CLOSED",      label: "ปิด",               icon: XCircle,      color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB" },
];

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-gray-300",
  MEDIUM: "bg-blue-400",
  HIGH: "bg-amber-400",
  URGENT: "bg-red-500",
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "ต่ำ", MEDIUM: "กลาง", HIGH: "สูง", URGENT: "ด่วน!",
};

function TicketCard({
  ticket,
  onDragStart,
}: {
  ticket: TicketItem;
  onDragStart: (e: React.DragEvent, id: string) => void;
}) {
  const ticketDisplay = ticket.system
    ? `${ticket.system.ticketPrefix}-${ticket.ticketNo}`
    : `#${ticket.ticketNo}`;
  const dotColor = PRIORITY_DOT[ticket.priority] || PRIORITY_DOT.MEDIUM;

  return (
    <Link
      href={`/ticket/${ticket.id}`}
      draggable
      onDragStart={(e) => onDragStart(e, ticket.id)}
      className="block bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-3 group cursor-grab active:cursor-grabbing"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`shrink-0 w-2 h-2 rounded-full ${dotColor}`} title={PRIORITY_LABEL[ticket.priority]} />
          <span className="text-xs font-mono font-bold truncate" style={{ color: ticket.system?.color || "#0066FF" }}>
            {ticketDisplay}
          </span>
        </div>
        {ticket.system && (
          <span
            className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: `${ticket.system.color}18`, color: ticket.system.color }}
          >
            {ticket.system.icon} {ticket.system.name}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-gray-800 line-clamp-2 mb-2 group-hover:text-nano-600 transition-colors">
        {ticket.title}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="truncate">{ticket.department?.name || "ทั่วไป"}</span>
        <div className="flex items-center gap-2 shrink-0">
          {ticket._count.comments > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare className="w-3 h-3" />
              {ticket._count.comments}
            </span>
          )}
          <span>
            {new Date(ticket.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit" })}
          </span>
        </div>
      </div>

      {ticket.assignedTo && (
        <div className="mt-2 flex items-center gap-1">
          <div className="w-5 h-5 rounded-full bg-nano-100 flex items-center justify-center text-[9px] font-bold text-nano-600">
            {ticket.assignedTo.displayName.charAt(0)}
          </div>
          <span className="text-[10px] text-gray-400 truncate">{ticket.assignedTo.displayName}</span>
        </div>
      )}
    </Link>
  );
}

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [draggedOverCol, setDraggedOverCol] = useState<string | null>(null);

  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [systems, setSystems] = useState<{ id: string; name: string; icon?: string | null }[]>([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSystem, setSelectedSystem] = useState("");

  useEffect(() => {
    // 1. Fetch tickets
    fetch("/api/tickets?limit=200")
      .then((r) => r.json())
      .then((d) => { setTickets(d.tickets || []); setLoading(false); })
      .catch(() => setLoading(false));

    // 2. Fetch departments
    fetch("/api/departments")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setDepartments(d);
        }
      })
      .catch((e) => console.error("Error loading departments:", e));

    // 3. Fetch systems
    fetch("/api/systems")
      .then((r) => r.json())
      .then((s) => {
        if (s && Array.isArray(s.systems)) {
          setSystems(s.systems);
        }
      })
      .catch((e) => console.error("Error loading systems:", e));
  }, []);

  const filtered = tickets.filter((t) => {
    // Search Query Filter
    if (searchQuery) {
      const display = t.system ? `${t.system.ticketPrefix}-${t.ticketNo}` : `#${t.ticketNo}`;
      const q = searchQuery.toLowerCase();
      const matchesSearch = t.title.toLowerCase().includes(q) || display.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    // Department Filter
    if (selectedDept) {
      if (t.department?.name !== selectedDept) return false;
    }

    // System Filter
    if (selectedSystem) {
      if (t.system?.id !== selectedSystem) return false;
    }

    return true;
  });

  const stats = {
    total: filtered.length,
    open: filtered.filter((t) => t.status === "OPEN").length,
    inProgress: filtered.filter((t) => t.status === "IN_PROGRESS").length,
    resolved: filtered.filter((t) => t.status === "RESOLVED").length,
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTicketId(id);
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggedOverCol !== status) {
      setDraggedOverCol(status);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDraggedOverCol(null);

    const ticketId = draggedTicketId || e.dataTransfer.getData("text/plain");
    if (!ticketId) return;

    setDraggedTicketId(null);

    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket || ticket.status === targetStatus) return;

    const originalStatus = ticket.status;

    // Optimistic UI Update
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: targetStatus } : t))
    );

    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "ไม่สามารถย้ายตั๋วงานได้");
      }
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ");
      // Rollback to original status
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: originalStatus } : t))
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-nano-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "ทั้งหมด", value: stats.total, color: "text-gray-700", bg: "bg-gray-50" },
          { label: "เปิดอยู่", value: stats.open, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "ดำเนินการ", value: stats.inProgress, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "แก้ไขแล้ว", value: stats.resolved, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-3 text-center`}>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหา ticket..."
            className="input-field !pl-9 !py-2 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setView("kanban")}
            className={`p-1.5 rounded-lg transition-all ${view === "kanban" ? "bg-white shadow text-nano-600" : "text-gray-400 hover:text-gray-600"}`}
            title="Kanban"
          >
            <Columns className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-1.5 rounded-lg transition-all ${view === "list" ? "bg-white shadow text-nano-600" : "text-gray-400 hover:text-gray-600"}`}
            title="List"
          >
            <LayoutList className="w-4 h-4" />
          </button>
        </div>

        <Link href="/ticket/new" className="btn-primary text-sm whitespace-nowrap !py-2">
          <PlusCircle className="w-4 h-4 mr-1" />
          แจ้งปัญหา
        </Link>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 bg-gray-50/50 p-2 rounded-xl border border-gray-100">
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 mb-1 pl-1">กรองตามแผนก</label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="input-field !py-1.5 text-xs bg-white cursor-pointer"
          >
            <option value="">ทุกแผนก</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-400 mb-1 pl-1">กรองตามระบบ</label>
          <select
            value={selectedSystem}
            onChange={(e) => setSelectedSystem(e.target.value)}
            className="input-field !py-1.5 text-xs bg-white cursor-pointer"
          >
            <option value="">ทุกระบบ</option>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon || "⚙️"} {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── KANBAN VIEW ─────────────────────────────────────────── */}
      {view === "kanban" && (
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4" style={{ scrollSnapType: "x mandatory" }}>
          {COLUMNS.map((col) => {
            const colTickets = filtered.filter((t) => t.status === col.key);
            const Icon = col.icon;
            return (
              <div
                key={col.key}
                className={`flex-shrink-0 w-[260px] rounded-2xl flex flex-col transition-all duration-200 ${
                  draggedOverCol === col.key ? "ring-2 ring-nano-500 scale-[1.01] opacity-90 shadow-lg" : ""
                }`}
                style={{ scrollSnapAlign: "start", backgroundColor: col.bg, border: `1.5px solid ${col.border}` }}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={() => setDraggedOverCol(null)}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-3 pt-3 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-4 h-4" style={{ color: col.color }} />
                    <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${col.color}22`, color: col.color }}
                  >
                    {colTickets.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)] px-3 pb-3 space-y-2">
                  {colTickets.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-400">ไม่มี ticket</div>
                  ) : (
                    colTickets.map((t) => (
                      <TicketCard key={t.id} ticket={t} onDragStart={handleDragStart} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── LIST VIEW ───────────────────────────────────────────── */}
      {view === "list" && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-gray-400 text-sm">ไม่มี Ticket</p>
              <Link href="/ticket/new" className="btn-primary mt-4 inline-flex">
                <PlusCircle className="w-4 h-4 mr-1.5" /> แจ้งปัญหาใหม่
              </Link>
            </div>
          ) : (
            filtered.map((ticket) => {
              const col = COLUMNS.find((c) => c.key === ticket.status) || COLUMNS[0];
              const Icon = col.icon;
              const ticketDisplay = ticket.system
                ? `${ticket.system.ticketPrefix}-${ticket.ticketNo}`
                : `#${ticket.ticketNo}`;
              return (
                <Link
                  key={ticket.id}
                  href={`/ticket/${ticket.id}`}
                  className="card-hover flex items-center gap-3 !p-3 group"
                >
                  <Icon className="w-5 h-5 shrink-0" style={{ color: col.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono font-bold" style={{ color: ticket.system?.color || "#0066FF" }}>
                        {ticketDisplay}
                      </span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${col.color}20`, color: col.color }}
                      >
                        {col.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">{ticket.title}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {new Date(ticket.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit" })}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
