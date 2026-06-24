"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Wrench, ChevronRight, Clock, User, Loader2 } from "lucide-react";

interface TicketItem {
  id: string;
  ticketNo: number;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  system: { id: string; name: string; icon: string | null; color: string; ticketPrefix: string } | null;
  createdBy: { displayName: string } | null;
  department: { name: string } | null;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  OPEN: { label: "เปิด", color: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "กำลังดำเนินการ", color: "bg-amber-100 text-amber-700" },
  PENDING: { label: "รอข้อมูล", color: "bg-purple-100 text-purple-700" },
};

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-gray-400",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-amber-500",
  URGENT: "bg-red-500 animate-pulse",
};

export default function ITQueuePage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tickets?limit=100")
      .then((res) => res.json())
      .then((data) => {
        // กรองเฉพาะสถานะที่ยังทำไม่เสร็จ (OPEN, IN_PROGRESS, PENDING)
        const activeTickets = (data.tickets || []).filter(
          (t: TicketItem) => ["OPEN", "IN_PROGRESS", "PENDING"].includes(t.status)
        );
        setTickets(activeTickets);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

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
        <div>
          <p className="text-sm text-gray-500">Ticket ที่คุณได้รับมอบหมายและกำลังดำเนินการ</p>
        </div>
        <span className="badge bg-nano-50 text-nano-600">{tickets.length} รายการ</span>
      </div>

      <div className="space-y-3">
        {tickets.map((ticket) => {
          const status = STATUS_LABEL[ticket.status] || STATUS_LABEL.OPEN;
          const ticketDisplay = ticket.system
            ? `${ticket.system.ticketPrefix}-${ticket.ticketNo}`
            : `#${ticket.ticketNo}`;

          return (
            <Link
              key={ticket.id}
              href={`/ticket/${ticket.id}`}
              className="card-hover flex items-center gap-4 !p-4 group"
            >
              <div className={`w-3 h-3 rounded-full ${PRIORITY_DOT[ticket.priority] || "bg-gray-400"} shrink-0`} />
              
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
                  <span>👤 {ticket.createdBy?.displayName || "—"}</span>
                  <span>
                    🕐{" "}
                    {new Date(ticket.createdAt).toLocaleDateString("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span>📁 {ticket.department?.name || "ทั่วไป"}</span>
                </div>
              </div>
              
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-nano-500 shrink-0" />
            </Link>
          );
        })}

        {tickets.length === 0 && (
          <div className="card text-center py-12 text-gray-400">
            <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">ไม่มีงานค้างในคิวของคุณ</p>
          </div>
        )}
      </div>
    </div>
  );
}
