"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bot,
  Ticket,
  PlusCircle,
  Wrench,
  Building2,
  Users,
  BarChart3,
  Settings,
  FolderOpen,
  Tag,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Bell,
  LayoutDashboard,
  Loader2,
  Server,
  MessageSquare,
} from "lucide-react";

interface UserSession {
  id: string;
  tenantId: string;
  tenantSlug: string;
  tenantPlan: string;
  tenantDbMode: string;
  departmentId: string | null;
  role: string;
  displayName: string;
  pictureUrl?: string;
}

interface MenuItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

const menuItems: MenuItem[] = [
  { label: "Kanban บอร์ด", href: "/ticket", icon: Ticket, roles: ["USER", "IT", "DEPT_ADMIN", "ADMIN", "SUPER_ADMIN"] },
  { label: "แจ้งปัญหาใหม่", href: "/ticket/new", icon: PlusCircle, roles: ["USER", "IT", "DEPT_ADMIN", "ADMIN", "SUPER_ADMIN"] },
  { label: "คิวงาน IT", href: "/it", icon: Wrench, roles: ["IT", "DEPT_ADMIN", "ADMIN", "SUPER_ADMIN"] },
  { label: "Ticket ในแผนก", href: "/dept", icon: FolderOpen, roles: ["DEPT_ADMIN", "ADMIN", "SUPER_ADMIN"] },
  { label: "สมาชิกในแผนก", href: "/dept/members", icon: Users, roles: ["DEPT_ADMIN", "ADMIN", "SUPER_ADMIN"] },
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, roles: ["ADMIN", "SUPER_ADMIN"] },
  { label: "จัดการระบบ", href: "/admin/systems", icon: Server, roles: ["ADMIN", "SUPER_ADMIN"] },
  { label: "จัดการ Group", href: "/admin/groups", icon: MessageSquare, roles: ["ADMIN", "SUPER_ADMIN"] },
  { label: "จัดการผู้ใช้", href: "/admin/users", icon: Users, roles: ["ADMIN", "SUPER_ADMIN"] },
  { label: "จัดการแผนก", href: "/admin/departments", icon: Building2, roles: ["ADMIN", "SUPER_ADMIN"] },
  { label: "จัดการหมวดหมู่", href: "/admin/categories", icon: Tag, roles: ["ADMIN", "SUPER_ADMIN"] },
  { label: "รายงานและสถิติ", href: "/admin/report", icon: BarChart3, roles: ["ADMIN", "SUPER_ADMIN"] },
  { label: "ตั้งค่าระบบ", href: "/settings", icon: Settings, roles: ["SUPER_ADMIN"] },
];

const PLAN_BADGE: Record<string, { label: string; color: string }> = {
  TRIAL: { label: "ทดลองใช้", color: "bg-gray-100 text-gray-600" },
  STARTER: { label: "Starter", color: "bg-blue-100 text-blue-700" },
  PRO: { label: "Pro", color: "bg-purple-100 text-purple-700" },
  ENTERPRISE: { label: "Enterprise", color: "bg-amber-100 text-amber-700" },
};

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get("tenant") || "demo";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    window.location.href = `/login?tenant=${tenantSlug}`;
  };

  useEffect(() => {
    fetch("/api/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          window.location.href = `/login?tenant=${tenantSlug}`;
        }
        setLoading(false);
      })
      .catch(() => {
        window.location.href = `/login?tenant=${tenantSlug}`;
        setLoading(false);
      });
  }, [tenantSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-nano-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const userRole = user.role;
  const planInfo = PLAN_BADGE[user.tenantPlan] || PLAN_BADGE.TRIAL;

  const filteredMenu = menuItems.filter((item) =>
    item.roles.includes(userRole)
  );

  // Group menu items
  const userMenus = filteredMenu.filter((m) =>
    ["/ticket", "/ticket/new"].includes(m.href)
  );
  const operationMenus = filteredMenu.filter((m) =>
    ["/it", "/dept", "/dept/members"].includes(m.href)
  );
  const adminMenus = filteredMenu.filter((m) =>
    m.href.startsWith("/admin") || m.href === "/settings"
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-[260px] bg-white border-r border-gray-100 z-50 transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-gradient-nano flex items-center justify-center shadow-nano">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">น้องนาโน</div>
              <div className="text-xs text-gray-400">บริษัททดสอบ จำกัด</div>
            </div>
            <button
              className="ml-auto lg:hidden p-1"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-6">
            {/* User Section */}
            <div>
              <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                งานของฉัน
              </div>
              <div className="space-y-1">
                {userMenus.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      pathname === item.href
                        ? "sidebar-link-active"
                        : "sidebar-link"
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Operations Section */}
            {operationMenus.length > 0 && (
              <div>
                <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  จัดการงาน
                </div>
                <div className="space-y-1">
                  {operationMenus.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={
                        pathname === item.href
                          ? "sidebar-link-active"
                          : "sidebar-link"
                      }
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Section */}
            {adminMenus.length > 0 && (
              <div>
                <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  ผู้ดูแลระบบ
                </div>
                <div className="space-y-1">
                  {adminMenus.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={
                        item.href === "/admin"
                          ? pathname === "/admin"
                            ? "sidebar-link-active"
                            : "sidebar-link"
                          : pathname === item.href || pathname.startsWith(item.href + "/")
                            ? "sidebar-link-active"
                            : "sidebar-link"
                      }
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </nav>

          {/* Plan Badge */}
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className={`badge ${planInfo.color}`}>
                {planInfo.label}
              </span>
              <span className="text-xs text-gray-400">แผนปัจจุบัน</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-[260px]">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 glass border-b border-gray-100/50 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 rounded-xl hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900">
                {filteredMenu.find((m) => m.href === pathname)?.label ||
                  "น้องนาโน"}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 rounded-xl hover:bg-gray-100 relative">
                <Bell className="w-5 h-5 text-gray-500" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  {user.pictureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.pictureUrl}
                      alt={user.displayName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-nano-100 flex items-center justify-center">
                      <span className="text-sm font-semibold text-nano-600">
                        {user.displayName.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {user.displayName}
                    </div>
                    <div className="text-xs text-gray-400">
                      {user.role === "SUPER_ADMIN"
                        ? "ผู้ดูแลสูงสุด"
                        : user.role === "ADMIN"
                          ? "ผู้ดูแลระบบ"
                          : user.role === "DEPT_ADMIN"
                            ? "หัวหน้าแผนก"
                            : user.role === "IT"
                              ? "เจ้าหน้าที่ IT"
                              : "ผู้ใช้งาน"}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {user.displayName}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {user.tenantSlug}
                        </div>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        ออกจากระบบ
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-nano-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">กำลังโหลด...</p>
        </div>
      </div>
    }>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
