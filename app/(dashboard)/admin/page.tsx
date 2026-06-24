"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Loader2, Search, TrendingUp, Clock, CheckCircle2,
  Circle, Pause, XCircle, AlertTriangle, Users, Ticket,
  RefreshCw, ChevronRight,
} from "lucide-react";

interface SystemInfo {
  id: string; code: string; name: string;
  icon: string | null; color: string; ticketPrefix: string;
  stats: { total: number; open: number; inProgress: number };
}
interface TicketItem {
  id: string; ticketNo: number; title: string;
  status: string; priority: string; ticketType: string; createdAt: string;
  system: { id: string; name: string; icon: string | null; color: string; ticketPrefix: string } | null;
  createdBy: { displayName: string } | null;
  assignedTo: { displayName: string } | null;
  _count?: { comments: number };
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  OPEN:        { label: "เปิด",           color: "#3B82F6", bg: "#EFF6FF", icon: Circle },
  IN_PROGRESS: { label: "ดำเนินการ",      color: "#F59E0B", bg: "#FFFBEB", icon: Clock },
  PENDING:     { label: "รอข้อมูล",       color: "#8B5CF6", bg: "#F5F3FF", icon: Pause },
  RESOLVED:    { label: "แก้ไขแล้ว",      color: "#10B981", bg: "#ECFDF5", icon: CheckCircle2 },
  CLOSED:      { label: "ปิด",            color: "#6B7280", bg: "#F9FAFB", icon: XCircle },
};

const PRIORITY_CFG: Record<string, { label: string; dot: string }> = {
  LOW:    { label: "ต่ำ",    dot: "bg-gray-300" },
  MEDIUM: { label: "กลาง",   dot: "bg-blue-400" },
  HIGH:   { label: "สูง",    dot: "bg-amber-400" },
  URGENT: { label: "ด่วน!",  dot: "bg-red-500 animate-pulse" },
};

/** CSS-only Donut Chart */
function DonutChart({ segments }: { segments: { value: number; color: string; label: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <div className="w-24 h-24 rounded-full bg-gray-100 mx-auto" />;

  let cumulative = 0;
  const gradientParts = segments.map((seg) => {
    const pct = (seg.value / total) * 100;
    const start = cumulative;
    cumulative += pct;
    return `${seg.color} ${start.toFixed(1)}% ${cumulative.toFixed(1)}%`;
  });

  return (
    <div className="relative w-24 h-24 mx-auto">
      <div
        className="w-24 h-24 rounded-full"
        style={{ background: `conic-gradient(${gradientParts.join(", ")})` }}
      />
      {/* Hole */}
      <div className="absolute inset-3 rounded-full bg-white flex items-center justify-center">
        <span className="text-sm font-bold text-gray-700">{total}</span>
      </div>
    </div>
  );
}

/** CSS Bar */
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-gray-500 w-6 text-right">{value}</span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [systems, setSystems] = useState<SystemInfo[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemFilter, setSystemFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const [sysData, ticketData] = await Promise.all([
      fetch("/api/systems").then((r) => r.json()),
      fetch("/api/tickets?limit=200").then((r) => r.json()),
    ]);
    setSystems(sysData.systems || []);
    setTickets(ticketData.tickets || []);
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const active = tickets.filter((t) => t.status !== "CLOSED");
  const statusCounts = Object.keys(STATUS_CFG).reduce((acc, k) => {
    acc[k] = tickets.filter((t) => t.status === k).length;
    return acc;
  }, {} as Record<string, number>);

  const urgentCount = tickets.filter((t) => t.priority === "URGENT" && t.status !== "CLOSED" && t.status !== "RESOLVED").length;

  const filtered = tickets.filter((t) => {
    if (systemFilter !== "all" && t.system?.id !== systemFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (searchText && !t.title.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-7 h-7 text-nano-500 animate-spin" />
    </div>
  );

  const donutSegments = Object.entries(STATUS_CFG).map(([k, v]) => ({
    value: statusCounts[k] || 0,
    color: v.color,
    label: v.label,
  }));

  return (
    <div className="space-y-5">

      {/* ─── ROW 1: Big Stats ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Ticket,       label: "ทั้งหมด",    value: tickets.length,         color: "#6366F1", bg: "#EEF2FF" },
          { icon: Circle,       label: "เปิดอยู่",   value: statusCounts.OPEN || 0,  color: "#3B82F6", bg: "#EFF6FF" },
          { icon: Clock,        label: "ดำเนินการ",  value: statusCounts.IN_PROGRESS || 0, color: "#F59E0B", bg: "#FFFBEB" },
          { icon: AlertTriangle,label: "ด่วน!",      value: urgentCount,             color: "#EF4444", bg: "#FEF2F2" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl p-4" style={{ backgroundColor: s.bg }}>
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5" style={{ color: s.color }} />
                {s.label === "ด่วน!" && s.value > 0 && (
                  <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">!</span>
                )}
              </div>
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* ─── ROW 2: Donut + System Bars ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Donut Chart */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">สัดส่วน Ticket ตามสถานะ</h3>
          <div className="flex items-center gap-4">
            <DonutChart segments={donutSegments} />
            <div className="flex-1 space-y-2">
              {Object.entries(STATUS_CFG).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.color }} />
                    <span className="text-gray-600">{v.label}</span>
                  </div>
                  <span className="font-semibold text-gray-700">{statusCounts[k] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Breakdown */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Ticket ตามระบบ</h3>
          <div className="space-y-3">
            {systems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีระบบ</p>
            ) : (
              systems.slice(0, 5).map((sys) => {
                const sysTotal = tickets.filter((t) => t.system?.id === sys.id).length;
                const maxVal = Math.max(...systems.map((s) => tickets.filter((t) => t.system?.id === s.id).length), 1);
                return (
                  <div key={sys.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        {sys.icon || "⚙️"} {sys.name}
                      </span>
                      <span className="text-[10px]" style={{ color: sys.color }}>
                        {sys.stats.open} เปิด
                      </span>
                    </div>
                    <MiniBar value={sysTotal} max={maxVal} color={sys.color} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ─── ROW 3: Recent Urgent ──────────────────────────────── */}
      {urgentCount > 0 && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <h3 className="text-sm font-semibold text-red-700 flex items-center gap-1.5 mb-3">
            <AlertTriangle className="w-4 h-4" />
            Ticket ด่วน — ต้องดำเนินการทันที ({urgentCount})
          </h3>
          <div className="space-y-2">
            {tickets
              .filter((t) => t.priority === "URGENT" && t.status !== "CLOSED" && t.status !== "RESOLVED")
              .slice(0, 3)
              .map((t) => {
                const display = t.system ? `${t.system.ticketPrefix}-${t.ticketNo}` : `#${t.ticketNo}`;
                return (
                  <Link key={t.id} href={`/ticket/${t.id}`}
                    className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono font-bold text-red-600">{display}</span>
                      <span className="text-sm text-gray-700 truncate">{t.title}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-red-300 shrink-0" />
                  </Link>
                );
              })}
          </div>
        </div>
      )}

      {/* ─── ROW 4: Filters + Table ────────────────────────────── */}
      <div className="card !p-0">
        {/* Table Header */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 flex-1">รายการ Ticket ทั้งหมด</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="ค้นหา..." value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="input-field !pl-8 !py-1.5 text-sm !w-40" />
            </div>
            <select className="input-field !w-auto text-sm !py-1.5" value={systemFilter}
              onChange={(e) => setSystemFilter(e.target.value)}>
              <option value="all">ทุกระบบ</option>
              {systems.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
            </select>
            <select className="input-field !w-auto text-sm !py-1.5" value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">ทุกสถานะ</option>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button onClick={refresh} disabled={refreshing}
              className="p-1.5 rounded-lg text-gray-400 hover:text-nano-500 hover:bg-nano-50 transition-colors">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                {["#", "ระบบ", "หัวข้อ", "สถานะ", "ผู้รับ", "วันที่"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-sm text-gray-400">ไม่พบ Ticket</td></tr>
              ) : (
                filtered.slice(0, 50).map((ticket) => {
                  const sc = STATUS_CFG[ticket.status] || STATUS_CFG.OPEN;
                  const pc = PRIORITY_CFG[ticket.priority] || PRIORITY_CFG.MEDIUM;
                  const display = ticket.system
                    ? `${ticket.system.ticketPrefix}-${ticket.ticketNo}`
                    : `#${ticket.ticketNo}`;
                  return (
                    <tr key={ticket.id}
                      className="border-t border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
                      onClick={() => (window.location.href = `/ticket/${ticket.id}`)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${pc.dot}`} />
                          <span className="text-sm font-mono font-bold" style={{ color: ticket.system?.color || "#6366F1" }}>
                            {display}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {ticket.system ? (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${ticket.system.color}18`, color: ticket.system.color }}>
                            {ticket.system.icon} {ticket.system.name}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 max-w-xs truncate">{ticket.title}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: sc.bg, color: sc.color }}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {ticket.assignedTo?.displayName || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(ticket.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit" })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 50 && (
          <div className="px-4 py-3 text-xs text-gray-400 border-t border-gray-50 text-center">
            แสดง 50 จาก {filtered.length} รายการ
          </div>
        )}
      </div>
    </div>
  );
}
