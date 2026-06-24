"use client";

import { useState, useEffect } from "react";
import { Search, MessageSquare, ArrowUpRight, ArrowDownLeft, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface ChatLogItem {
  id: string;
  lineUid: string;
  displayName: string | null;
  lineGroupId: string | null;
  messageText: string | null;
  direction: string;
  replyAction: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ChatLogsPage() {
  const [logs, setLogs] = useState<ChatLogItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState("");

  async function loadLogs(page = 1) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (search) params.set("search", search);
    if (direction) params.set("direction", direction);

    try {
      const res = await fetch(`/api/chatlogs?${params}`);
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLogs(); }, [direction]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-nano-500" />
            Chat Logs
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            บันทึกการสนทนาทั้งหมด ({pagination.total.toLocaleString()} รายการ)
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card !p-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาข้อความหรือชื่อผู้ใช้..."
              className="input-field !pl-9 !py-2 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input-field !py-2 text-sm !w-auto"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
          >
            <option value="">ทั้งหมด</option>
            <option value="INCOMING">ขาเข้า</option>
            <option value="OUTGOING">ขาออก</option>
          </select>
          <button type="submit" className="btn-primary text-sm !py-2">ค้นหา</button>
        </form>
      </div>

      {/* Chat Log Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-nano-500 animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="card text-center py-16">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">ยังไม่มี Chat Log</p>
        </div>
      ) : (
        <div className="card !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">ทิศทาง</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">ผู้ส่ง</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">ข้อความ</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Action</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">เวลา</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      {log.direction === "INCOMING" ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600">
                          <ArrowDownLeft className="w-3 h-3" /> เข้า
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
                          <ArrowUpRight className="w-3 h-3" /> ออก
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {log.direction === "INCOMING" ? (log.displayName || "ผู้ใช้") : "🤖 Bot"}
                      </div>
                      {log.lineGroupId && (
                        <div className="text-xs text-gray-400">Group</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700 max-w-md truncate">
                        {log.messageText || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {log.replyAction && (
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-600">
                          {log.replyAction}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("th-TH")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                หน้า {pagination.page} / {pagination.totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => loadLogs(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => loadLogs(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
