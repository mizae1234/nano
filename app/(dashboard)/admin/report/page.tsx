"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Loader2, Building2 } from "lucide-react";

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

export default function AdminReportPage() {
  const [period, setPeriod] = useState("month");
  const [deptFilter, setDeptFilter] = useState("all");
  const [departments, setDepartments] = useState<DeptFilterItem[]>([]);
  
  const [stats, setStats] = useState<StatItem[]>([]);
  const [deptStats, setDeptStats] = useState<DeptStatItem[]>([]);
  const [topCategories, setTopCategories] = useState<TopCategoryItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // โหลดแผนกสำหรับฟิลเตอร์
    fetch("/api/departments")
      .then((r) => r.json())
      .then((data) => {
        setDepartments(data || []);
      })
      .catch((e) => console.error(e));
  }, []);

  useEffect(() => {
    loadReport();
  }, [period, deptFilter]);

  async function loadReport() {
    setRefreshing(true);
    try {
      const url = `/api/report?period=${period}&departmentId=${deptFilter}`;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-nano-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
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
        </select>
        
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

        {refreshing && <Loader2 className="w-4 h-4 text-nano-500 animate-spin ml-2" />}
      </div>

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
            {deptStats.map((d) => {
              const maxVal = Math.max(...deptStats.map((x) => x.total), 1);
              return (
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
              );
            })}
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
  );
}
