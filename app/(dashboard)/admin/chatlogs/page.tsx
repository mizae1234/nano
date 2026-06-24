"use client";

import { useState, useEffect } from "react";
import { Search, MessageSquare, ArrowUpRight, ArrowDownLeft, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface ChatLogItem {
  id: string;
  lineUid: string;
  displayName: string | null;
  lineGroupId: string | null;
  messageText: string | null;
  botResponse: string | null;
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

  async function loadLogs(page = 1) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (search) params.set("search", search);

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

  useEffect(() => { loadLogs(); }, []);

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
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 w-1/5">ผู้ใช้ / กลุ่ม</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 w-1/3">ข้อความจากผู้ใช้ (INCOMING)</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 w-1/3">คำตอบของบอท (OUTGOING)</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 w-10">Action</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 w-10">เวลา</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 align-top">
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-gray-800">
                        {log.displayName || "ผู้ใช้"}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5 truncate max-w-[150px]" title={log.lineUid}>
                        UID: {log.lineUid.slice(0, 10)}...
                      </div>
                      {log.lineGroupId && (
                        <span className="inline-flex items-center text-[10px] px-2 py-0.5 mt-1 rounded bg-amber-50 text-amber-700 font-medium">
                          👥 Group
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-block bg-blue-50 text-blue-900 text-sm px-3 py-2 rounded-2xl rounded-tl-none border border-blue-100 max-w-sm whitespace-pre-wrap break-words">
                        {log.messageText || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {log.botResponse ? (
                        <div className="inline-block bg-emerald-50 text-emerald-900 text-sm px-3 py-2 rounded-2xl rounded-tl-none border border-emerald-100 max-w-sm whitespace-pre-wrap break-words">
                          {log.botResponse}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">ไม่มีการตอบกลับจากบอท / รอการประมวลผล</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {log.replyAction ? (
                        <span className="inline-block text-[10px] font-semibold px-2 py-1 rounded bg-purple-50 text-purple-700 whitespace-nowrap">
                          {log.replyAction}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
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
