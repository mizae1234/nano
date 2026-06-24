"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Loader2,
  Building2,
  Download,
  Calendar,
  Search,
  FileText,
} from "lucide-react";

interface StatItem {
  label: string;
  value: string;
  change: string;
  color: string;
  bgColor: string;
}

interface DeptStatItem {
  name: string;
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  avgTime: string;
}

interface TopCategoryItem {
  name: string;
  count: number;
  percentage: number;
}

interface DeptFilterItem {
  id: string;
  name: string;
}

interface DetailedTicketItem {
  id: string;
  ticketNo: number;
  title: string;
  priority: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  dueDate: string | null;
  createdBy: { displayName: string };
  assignedTo: { displayName: string } | null;
  department: { name: string } | null;
  system: { ticketPrefix: string } | null;
  category: { name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-50 text-blue-700 border-blue-100",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-100",
  PENDING: "bg-orange-50 text-orange-700 border-orange-100",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  CLOSED: "bg-gray-50 text-gray-700 border-gray-100",
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-red-50 text-red-700 border-red-100",
  HIGH: "bg-orange-50 text-orange-700 border-orange-100",
  MEDIUM: "bg-blue-50 text-blue-700 border-blue-100",
  LOW: "bg-gray-50 text-gray-700 border-gray-100",
};

function formatPriority(p: string): string {
  switch (p) {
    case "URGENT": return "ด่วนที่สุด";
    case "HIGH": return "ด่วน";
    case "MEDIUM": return "ปานกลาง";
    case "LOW": return "ต่ำ";
    default: return p;
  }
}

function formatStatus(s: string): string {
  switch (s) {
    case "OPEN": return "เปิดอยู่";
    case "IN_PROGRESS": return "กำลังดำเนินการ";
    case "PENDING": return "รอดำเนินการ";
    case "RESOLVED": return "แก้ไขแล้ว";
    case "CLOSED": return "ปิดแล้ว";
    default: return s;
  }
}

function formatSla(createdAt: string, resolvedAt: string | null): string {
  if (!resolvedAt) return "-";
  const diffMs = new Date(resolvedAt).getTime() - new Date(createdAt).getTime();
  if (diffMs < 0) return "0 นาที";
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 60) return `${diffMins} นาที`;
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 24) return `${diffHours.toFixed(1)} ชม.`;
  const days = Math.floor(diffHours / 24);
  const remainingHours = (diffHours % 24).toFixed(1);
  return `${days} วัน ${remainingHours} ชม.`;
}

export default function AdminReportPage() {
  const [activeTab, setActiveTab] = useState<"summary" | "details">("summary");
  
  // Filters
  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Data
  const [departments, setDepartments] = useState<DeptFilterItem[]>([]);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [deptStats, setDeptStats] = useState<DeptStatItem[]>([]);
  const [topCategories, setTopCategories] = useState<TopCategoryItem[]>([]);
  const [detailedTickets, setDetailedTickets] = useState<DetailedTicketItem[]>([]);

  // States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // โหลดแผนกสำหรับตัวกรอง
    fetch("/api/departments")
      .then((r) => r.json())
      .then((data) => {
        setDepartments(data || []);
      })
      .catch((e) => console.error(e));
  }, []);

  useEffect(() => {
    if (activeTab === "summary") {
      loadSummaryReport();
    } else {
      loadDetailedReport();
    }
  }, [activeTab, period, startDate, endDate, deptFilter, statusFilter, searchQuery]);

  async function loadSummaryReport() {
    setRefreshing(true);
    try {
      let url = `/api/report?period=${period}&departmentId=${deptFilter}&status=${statusFilter}`;
      if (period === "custom") {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      
      setStats(data.stats || []);
      setDeptStats(data.deptStats || []);
      setTopCategories(data.topCategories || []);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadDetailedReport() {
    setRefreshing(true);
    try {
      let url = `/api/report?detail=true&period=${period}&departmentId=${deptFilter}&status=${statusFilter}`;
      if (period === "custom") {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      
      setDetailedTickets(data.tickets || []);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "details") {
      loadDetailedReport();
    } else {
      loadSummaryReport();
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      let url = `/api/report?detail=true&period=${period}&departmentId=${deptFilter}&status=${statusFilter}`;
      if (period === "custom") {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      const ticketsToExport: DetailedTicketItem[] = data.tickets || [];

      if (ticketsToExport.length === 0) {
        alert("ไม่มีข้อมูลที่จะส่งออกตามเงื่อนไขที่เลือก");
        setExporting(false);
        return;
      }

      // หัวตาราง Excel
      const headers = [
        "หมายเลขตั๋ว",
        "หัวข้อ",
        "ผู้แจ้ง",
        "แผนกที่ดูแล",
        "ผู้รับผิดชอบ",
        "ความสำคัญ",
        "สถานะ",
        "หมวดหมู่",
        "วันเวลาที่สร้าง",
        "วันเวลาที่แก้ไขเสร็จ/ปิด",
        "กำหนดเสร็จ (Due Date)",
        "เวลาที่ใช้ (SLA Hours)"
      ];

      // แปลงข้อมูลเป็นแถว Excel
      const rows = ticketsToExport.map((t) => {
        const ticketId = `${t.system?.ticketPrefix || "TKT"}-${t.ticketNo}`;
        const title = t.title;
        const creator = t.createdBy.displayName;
        const dept = t.department?.name || "-";
        const assignee = t.assignedTo?.displayName || "-";
        const priority = formatPriority(t.priority);
        const status = formatStatus(t.status);
        const category = t.category?.name || "-";
        const createdAtStr = new Date(t.createdAt).toLocaleString("th-TH");
        const resolvedAtStr = t.resolvedAt ? new Date(t.resolvedAt).toLocaleString("th-TH") : "-";
        const dueDateStr = t.dueDate ? new Date(t.dueDate).toLocaleDateString("th-TH") : "-";
        
        let slaHours: string | number = "-";
        if (t.resolvedAt) {
          const diffMs = new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime();
          const hours = diffMs / (1000 * 60 * 60);
          slaHours = parseFloat(hours.toFixed(1));
        }

        return [
          ticketId,
          title,
          creator,
          dept,
          assignee,
          priority,
          status,
          category,
          createdAtStr,
          resolvedAtStr,
          dueDateStr,
          slaHours
        ];
      });

      // ใช้ xlsx ในการสร้างไฟล์
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

      // กำหนดความกว้างของคอลัมน์แบบพอดีคำคร่าวๆ
      ws["!cols"] = [
        { wch: 12 }, // หมายเลขตั๋ว
        { wch: 35 }, // หัวข้อ
        { wch: 18 }, // ผู้แจ้ง
        { wch: 15 }, // แผนกที่ดูแล
        { wch: 18 }, // ผู้รับผิดชอบ
        { wch: 12 }, // ความสำคัญ
        { wch: 15 }, // สถานะ
        { wch: 15 }, // หมวดหมู่
        { wch: 20 }, // วันเวลาที่สร้าง
        { wch: 20 }, // วันเวลาที่แก้ไขเสร็จ
        { wch: 15 }, // กำหนดเสร็จ
        { wch: 12 }, // SLA Hours
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "รายงานตั๋วงาน");

      // สั่งดาวน์โหลดไฟล์ Excel (.xlsx)
      XLSX.writeFile(wb, `sla_report_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (error) {
      console.error("Export error:", error);
      alert("เกิดข้อผิดพลาดในการส่งออกข้อมูล");
    } finally {
      setExporting(false);
    }
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
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("summary")}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "summary"
              ? "border-nano-500 text-nano-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          ภาพรวมระบบ (Overview)
        </button>
        <button
          onClick={() => setActiveTab("details")}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "details"
              ? "border-nano-500 text-nano-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <FileText className="w-4 h-4" />
          รายงานรายละเอียด & SLA
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          {/* เลือกช่วงเวลา */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">ช่วงเวลา</label>
            <select
              className="input-field !w-auto text-sm"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              disabled={refreshing}
            >
              <option value="week">สัปดาห์นี้ (7 วัน)</option>
              <option value="month">เดือนนี้ (30 วัน)</option>
              <option value="quarter">ไตรมาสนี้ (90 วัน)</option>
              <option value="year">ปีนี้ (365 วัน)</option>
              <option value="custom">กำหนดเอง (Custom Date)</option>
              <option value="all">ทั้งหมด (All Time)</option>
            </select>
          </div>

          {/* เลือกแผนก */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">แผนกที่ดูแล</label>
            <select
              className="input-field !w-auto text-sm"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              disabled={refreshing}
            >
              <option value="all">ทุกแผนกที่รับเรื่อง</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* เลือกสถานะ */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">สถานะตั๋ว</label>
            <select
              className="input-field !w-auto text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={refreshing}
            >
              <option value="all">ทุกสถานะ</option>
              <option value="OPEN">เปิดอยู่</option>
              <option value="IN_PROGRESS">กำลังดำเนินการ</option>
              <option value="PENDING">รอดำเนินการ</option>
              <option value="RESOLVED">แก้ไขเสร็จสิ้น</option>
              <option value="CLOSED">ปิดงานแล้ว</option>
            </select>
          </div>

          {/* ค้นหา */}
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-xs text-gray-400 font-medium">ค้นหา</label>
            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหา หัวข้อ, ผู้แจ้ง, ผู้รับผิดชอบ..."
                className="input-field text-sm pl-8 pr-4"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={refreshing}
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-3" />
            </div>
          </form>

          {/* ปุ่มดาวน์โหลด Excel/CSV */}
          {activeTab === "details" && (
            <div className="flex flex-col gap-1 mt-auto">
              <button
                onClick={handleExportCsv}
                disabled={exporting || refreshing}
                className="btn-primary !bg-emerald-600 hover:!bg-emerald-700 flex items-center gap-2 text-sm py-2 px-4 h-10 shadow-sm"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังดาวน์โหลด...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    ส่งออก Excel (CSV)
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* แถบเลือกวันที่เมื่อระบุแบบ กำหนดเอง */}
        {period === "custom" && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-50 bg-gray-50/30 p-2.5 rounded-xl">
            <Calendar className="w-4 h-4 text-nano-500" />
            <span className="text-xs text-gray-500 font-semibold">เลือกช่วงวันที่:</span>
            <input
              type="date"
              className="input-field !w-auto text-xs py-1"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={refreshing}
            />
            <span className="text-xs text-gray-400">ถึง</span>
            <input
              type="date"
              className="input-field !w-auto text-xs py-1"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={refreshing}
            />
            {refreshing && <Loader2 className="w-3.5 h-3.5 text-nano-500 animate-spin ml-2" />}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: ภาพรวมระบบ (Overview Summary)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="card relative overflow-hidden">
                <div className="text-sm text-gray-500 mb-1">{stat.label}</div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span>ประมวลผลตามช่วงเวลาจริง</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Department Comparison */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-400" />
                เปรียบเทียบระหว่างแผนก
              </h3>
              <div className="space-y-4">
                {deptStats.map((d) => (
                  <div key={d.name}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{d.name}</span>
                      <span className="text-sm text-gray-500">{d.total} Ticket</span>
                    </div>
                    <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                      {d.total > 0 ? (
                        <>
                          <div
                            className="bg-blue-400 transition-all"
                            style={{ width: `${(d.open / d.total) * 100}%` }}
                            title={`เปิด: ${d.open}`}
                          />
                          <div
                            className="bg-amber-400 transition-all"
                            style={{ width: `${(d.inProgress / d.total) * 100}%` }}
                            title={`ดำเนินการ: ${d.inProgress}`}
                          />
                          <div
                            className="bg-emerald-400 transition-all"
                            style={{ width: `${((d.resolved + d.closed) / d.total) * 100}%` }}
                            title={`เสร็จสิ้น: ${d.resolved + d.closed}`}
                          />
                        </>
                      ) : (
                        <div className="w-full bg-gray-100" />
                      )}
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                      <span>⏱ เฉลี่ยเวลา: {d.avgTime}</span>
                      <span>
                        เปิด: {d.open} | ทำอยู่: {d.inProgress} | เสร็จ: {d.resolved + d.closed}
                      </span>
                    </div>
                  </div>
                ))}
                {deptStats.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">ไม่มีข้อมูลแผนก</p>
                )}
              </div>
              <div className="flex gap-4 mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> เปิดอยู่
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> กำลังทำ
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> แก้ไขแล้ว
                </span>
              </div>
            </div>

            {/* Top Categories */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-gray-400" />
                หมวดหมู่ปัญหาที่ถูกแจ้งมากที่สุด
              </h3>
              <div className="space-y-4">
                {topCategories.map((cat, i) => (
                  <div key={cat.name} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700">{cat.name}</span>
                        <span className="text-sm font-medium text-gray-900">{cat.count} Ticket</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-nano-400 rounded-full transition-all"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-gray-400 text-right mt-0.5">
                        {cat.percentage}% ของตั๋วทั้งหมด
                      </div>
                    </div>
                  </div>
                ))}
                {topCategories.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-10">
                    ไม่มีข้อมูลหมวดหมู่ที่มีการแจ้งปัญหาเข้ามา
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: รายงานรายละเอียด & SLA (Detailed SLA Report Table)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "details" && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          {refreshing && (
            <div className="h-1 bg-nano-100 overflow-hidden relative">
              <div className="absolute top-0 bottom-0 left-0 bg-nano-500 w-1/3 animate-pulse" />
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-[120px]">หมายเลขตั๋ว</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">หัวเรื่อง</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-[120px]">ผู้แจ้ง</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-[120px]">แผนกที่ดูแล</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-[120px]">ผู้รับผิดชอบ</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-[80px]">ความสำคัญ</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-[100px]">สถานะ</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-[120px]">วันเวลาที่สร้าง</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-[120px]">วันที่แก้ไขเสร็จ/ปิด</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-[100px] text-right">เวลา SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {detailedTickets.map((t) => {
                  const ticketId = `${t.system?.ticketPrefix || "TKT"}-${t.ticketNo}`;
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors text-xs text-gray-700">
                      <td className="px-4 py-3 font-semibold font-mono text-gray-900">
                        <Link href={`/ticket/${t.id}`} className="text-nano-600 hover:underline">
                          #{ticketId}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium max-w-[200px] truncate" title={t.title}>
                        {t.title}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{t.createdBy.displayName}</td>
                      <td className="px-4 py-3 text-gray-500">{t.department?.name || "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{t.assignedTo?.displayName || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`badge border text-[10px] py-0.5 px-1.5 font-medium ${PRIORITY_COLORS[t.priority]}`}>
                          {formatPriority(t.priority)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge border text-[10px] py-0.5 px-1.5 font-semibold ${STATUS_COLORS[t.status]}`}>
                          {formatStatus(t.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400" title={new Date(t.createdAt).toLocaleString("th-TH")}>
                        {new Date(t.createdAt).toLocaleDateString("th-TH")}
                      </td>
                      <td className="px-4 py-3 text-gray-400" title={t.resolvedAt ? new Date(t.resolvedAt).toLocaleString("th-TH") : "-"}>
                        {t.resolvedAt ? new Date(t.resolvedAt).toLocaleDateString("th-TH") : "-"}
                      </td>
                      <td className="px-4 py-3 font-bold text-right text-gray-900">
                        {formatSla(t.createdAt, t.resolvedAt)}
                      </td>
                    </tr>
                  );
                })}
                {detailedTickets.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-gray-400 text-sm">
                      ไม่พบข้อมูลตั๋วงานตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
