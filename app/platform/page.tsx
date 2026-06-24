"use client";

import Link from "next/link";
import { Shield, Building2, Users, Ticket, TrendingUp, Plus, ChevronRight, Database, Clock } from "lucide-react";

const mockTenants = [
  { id: "1", slug: "demo", name: "บริษัททดสอบ จำกัด", plan: "TRIAL", isActive: true, dbMode: "SHARED", users: 5, tickets: 12, trialEndsAt: "04/07/2569" },
  { id: "2", slug: "icare", name: "iCare Solutions", plan: "PRO", isActive: true, dbMode: "SHARED", users: 25, tickets: 456, trialEndsAt: null },
  { id: "3", slug: "hotel", name: "โรงแรมสยาม", plan: "STARTER", isActive: true, dbMode: "SHARED", users: 15, tickets: 89, trialEndsAt: null },
  { id: "4", slug: "bigcorp", name: "บริษัทใหญ่ จำกัด (มหาชน)", plan: "ENTERPRISE", isActive: true, dbMode: "DEDICATED", users: 120, tickets: 2340, trialEndsAt: null },
];

const PLAN_BADGE: Record<string, { label: string; color: string }> = {
  TRIAL: { label: "ทดลองใช้", color: "bg-gray-100 text-gray-600" },
  STARTER: { label: "Starter", color: "bg-blue-100 text-blue-700" },
  PRO: { label: "Pro", color: "bg-purple-100 text-purple-700" },
  ENTERPRISE: { label: "Enterprise", color: "bg-amber-100 text-amber-700" },
};

export default function PlatformPage() {
  const stats = [
    { label: "Tenant ทั้งหมด", value: mockTenants.length, icon: Building2, color: "bg-nano-50 text-nano-600" },
    { label: "ผู้ใช้ทั้งหมด", value: mockTenants.reduce((s, t) => s + t.users, 0), icon: Users, color: "bg-purple-50 text-purple-600" },
    { label: "Ticket ทั้งหมด", value: mockTenants.reduce((s, t) => s + t.tickets, 0), icon: Ticket, color: "bg-emerald-50 text-emerald-600" },
    { label: "Active", value: mockTenants.filter(t => t.isActive).length, icon: TrendingUp, color: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-gray-900">Platform Admin</div>
              <div className="text-xs text-gray-400">น้องนาโน — ผู้ให้บริการ</div>
            </div>
          </div>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">กลับหน้าหลัก</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(stat => (
            <div key={stat.label} className="card">
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tenants */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">รายการ Tenant</h2>
            <Link href="/platform/tenants/new" className="btn-primary text-sm">
              <Plus className="w-4 h-4 mr-1.5" />
              สร้าง Tenant ใหม่
            </Link>
          </div>

          <div className="card !p-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">องค์กร</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">แผน</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">DB</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">ผู้ใช้</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Ticket</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">สถานะ</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {mockTenants.map(tenant => {
                  const plan = PLAN_BADGE[tenant.plan] || PLAN_BADGE.TRIAL;
                  return (
                    <tr key={tenant.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm text-gray-900">{tenant.name}</div>
                        <div className="text-xs text-gray-400">{tenant.slug}.technomand-ai.cloud</div>
                      </td>
                      <td className="px-4 py-3"><span className={`badge ${plan.color}`}>{plan.label}</span></td>
                      <td className="px-4 py-3">
                        <span className={`badge ${tenant.dbMode === "DEDICATED" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                          {tenant.dbMode === "DEDICATED" ? <><Database className="w-3 h-3 mr-1" />Dedicated</> : "Shared"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{tenant.users}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{tenant.tickets.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${tenant.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {tenant.isActive ? "ใช้งาน" : "ปิด"}
                        </span>
                        {tenant.trialEndsAt && (
                          <span className="badge bg-amber-50 text-amber-600 ml-1">
                            <Clock className="w-3 h-3 mr-1" />
                            หมดอายุ {tenant.trialEndsAt}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/platform/tenants/${tenant.id}`} className="text-xs text-nano-500 hover:underline">
                          จัดการ <ChevronRight className="w-3 h-3 inline" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
