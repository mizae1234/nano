"use client";

import { useState, useEffect } from "react";
import { LayoutDashboard, Loader2, Search, Filter } from "lucide-react";

interface SystemInfo {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  color: string;
  ticketPrefix: string;
  stats: { total: number; open: number; inProgress: number };
}

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
}

const STATUS: Record<string, { label: string; color: string }> = {
  OPEN: { label: "เปิด", color: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "กำลังดำเนินการ", color: "bg-amber-100 text-amber-700" },
  PENDING: { label: "รอข้อมูล", color: "bg-purple-100 text-purple-700" },
  RESOLVED: { label: "แก้ไขแล้ว", color: "bg-emerald-100 text-emerald-700" },
  CLOSED: { label: "ปิด", color: "bg-gray-100 text-gray-600" },
};

const TICKET_TYPE: Record<string, { label: string; icon: string }> = {
  BUG: { label: "ปัญหาระบบ", icon: "🐛" },
  FEATURE: { label: "ขอฟีเจอร์", icon: "✨" },
  TASK: { label: "งานทั่วไป", icon: "📋" },
  QUESTION: { label: "คำถาม", icon: "❓" },
};

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-gray-400", MEDIUM: "bg-blue-500", HIGH: "bg-amber-500", URGENT: "bg-red-500 animate-pulse",
};

export default function AdminDashboardPage() {
  const [systems, setSystems] = useState<SystemInfo[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemFilter, setSystemFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/systems").then((r) => r.json()),
      fetch("/api/tickets?limit=50").then((r) => r.json()),
    ]).then(([sysData, ticketData]) => {
      setSystems(sysData.systems || []);
      setTickets(ticketData.tickets || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-nano-500 animate-spin" />
      </div>
    );
  }

  const filtered = tickets.filter((t) => {
    if (systemFilter !== "all" && t.system?.id !== systemFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (typeFilter !== "all" && t.ticketType !== typeFilter) return false;
    if (searchText && !t.title.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* System Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card: ทั้งหมด */}
        <button
          onClick={() => setSystemFilter("all")}
          className={`rounded-xl border p-4 text-left transition-all hover:shadow-md ${
            systemFilter === "all"
              ? "border-nano-300 bg-nano-50 ring-2 ring-nano-200"
              : "border-gray-100 bg-white hover:border-gray-200"
          }`}
        >
          <div className="text-2xl font-bold text-gray-900">
            {tickets.filter((t) => t.status !== "CLOSED").length}
          </div>
          <div className="text-xs text-gray-500 mt-1">📊 ทั้งหมด (เปิดอยู่)</div>
        </button>

        {systems.filter((s) => s.stats.total > 0 || true).map((sys) => (
          <button
            key={sys.id}
            onClick={() => setSystemFilter(sys.id === systemFilter ? "all" : sys.id)}
            className={`rounded-xl border p-4 text-left transition-all hover:shadow-md ${
              systemFilter === sys.id
                ? "ring-2 ring-opacity-50"
                : "border-gray-100 bg-white hover:border-gray-200"
            }`}
            style={{
              borderColor: systemFilter === sys.id ? sys.color : undefined,
              backgroundColor: systemFilter === sys.id ? `${sys.color}10` : undefined,
              ...(systemFilter === sys.id ? { ["--tw-ring-color" as string]: sys.color } : {}),
            }}
          >
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold" style={{ color: sys.color }}>
                {sys.stats.open + sys.stats.inProgress}
              </span>
              {sys.stats.open > 0 && (
                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                  {sys.stats.open} new
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1 truncate">
              {sys.icon || "⚙️"} {sys.name}
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหา ticket..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="input-field !pl-9 text-sm"
          />
        </div>
        <select
          className="input-field !w-auto text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">ทุกสถานะ</option>
          {Object.entries(STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          className="input-field !w-auto text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">ทุกประเภท</option>
          {Object.entries(TICKET_TYPE).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
      </div>

      {/* Ticket Table */}
      <div className="card !p-0 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">#</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">ระบบ</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">หัวข้อ</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">ประเภท</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">สถานะ</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">ผู้รับผิดชอบ</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">วันที่</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                  ไม่พบ Ticket
                </td>
              </tr>
            ) : (
              filtered.map((ticket) => {
                const status = STATUS[ticket.status] || STATUS.OPEN;
                const type = TICKET_TYPE[ticket.ticketType] || TICKET_TYPE.BUG;
                const ticketDisplay = ticket.system
                  ? `${ticket.system.ticketPrefix}-${ticket.ticketNo}`
                  : `#${ticket.ticketNo}`;

                return (
                  <tr
                    key={ticket.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
                    onClick={() => (window.location.href = `/ticket/${ticket.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${PRIORITY_DOT[ticket.priority]}`} />
                        <span
                          className="text-sm font-mono font-bold"
                          style={{ color: ticket.system?.color || "#0066FF" }}
                        >
                          {ticketDisplay}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {ticket.system ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: `${ticket.system.color}15`,
                            color: ticket.system.color,
                          }}
                        >
                          {ticket.system.icon || "⚙️"} {ticket.system.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                      {ticket.title}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {type.icon} {type.label}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {ticket.assignedTo?.displayName || (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {new Date(ticket.createdAt).toLocaleDateString("th-TH", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
