"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FolderOpen, ChevronRight, Loader2 } from "lucide-react";

interface TicketItem {
  id: string;
  ticketNo: number;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  system: { id: string; name: string; icon: string | null; color: string; ticketPrefix: string } | null;
  createdBy: { displayName: string } | null;
  assignedTo: { displayName: string } | null;
  department: { name: string } | null;
}

const STATUS: Record<string, { label: string; color: string }> = {
  OPEN: { label: "เปิด", color: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "กำลังดำเนินการ", color: "bg-amber-100 text-amber-700" },
  PENDING: { label: "รอข้อมูล", color: "bg-purple-100 text-purple-700" },
  RESOLVED: { label: "แก้ไขแล้ว", color: "bg-emerald-100 text-emerald-700" },
  CLOSED: { label: "ปิด", color: "bg-gray-100 text-gray-600" },
};

export default function DeptTicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [deptName, setDeptName] = useState("แผนกของคุณ");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    Promise.all([
      fetch("/api/session").then((r) => r.json()),
      fetch("/api/tickets?limit=100").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
    ])
      .then(([sessionData, ticketsData, deptsData]) => {
        const userDeptId = sessionData.user?.departmentId;
        if (userDeptId && Array.isArray(deptsData)) {
          const matchedDept = deptsData.find((d: any) => d.id === userDeptId);
          if (matchedDept) setDeptName(matchedDept.name);
        }
        
        // กรองเฉพาะ ticket ที่เป็นของแผนกนี้ (ในกรณีที่ role ส่งกลับทั้งหมด หรือ /api/tickets กรองอัตโนมัติ)
        // สำหรับ DEPT_ADMIN, /api/tickets จะคืนเฉพาะในแผนกตัวเองอยู่แล้ว
        setTickets(ticketsData.tickets || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

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
        <p className="text-sm text-gray-500">
          Ticket ทั้งหมดในแผนก &quot;{deptName}&quot;
        </p>
        <select
          className="input-field !w-auto text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">ทุกสถานะ</option>
          {Object.entries(STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map((ticket) => {
          const status = STATUS[ticket.status] || STATUS.OPEN;
          const ticketDisplay = ticket.system
            ? `${ticket.system.ticketPrefix}-${ticket.ticketNo}`
            : `#${ticket.ticketNo}`;

          return (
            <Link
              key={ticket.id}
              href={`/ticket/${ticket.id}`}
              className="card-hover flex items-center gap-4 !p-4 group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-sm font-mono font-bold"
                    style={{ color: ticket.system?.color || "#0066FF" }}
                  >
                    {ticketDisplay}
                  </span>
                  {ticket.system && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${ticket.system.color}15`,
                        color: ticket.system.color,
                      }}
                    >
                      {ticket.system.icon || "⚙️"} {ticket.system.name}
                    </span>
                  )}
                  <span className={`badge ${status.color} text-[10px]`}>{status.label}</span>
                </div>
                <h3 className="text-sm font-medium text-gray-900 truncate">{ticket.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span>👤 ผู้แจ้ง: {ticket.createdBy?.displayName || "—"}</span>
                  <span>
                    📅{" "}
                    {new Date(ticket.createdAt).toLocaleDateString("th-TH", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                  {ticket.assignedTo && <span>🔧 ช่าง: {ticket.assignedTo.displayName}</span>}
                </div>
              </div>
              
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-nano-500 shrink-0" />
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <div className="card text-center py-12 text-gray-400">
            <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">ไม่มี Ticket ในแผนกนี้</p>
          </div>
        )}
      </div>
    </div>
  );
}
