"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Shield,
  BarChart3,
  Bot,
  Building2,
  Zap,
  ChevronRight,
  Check,
  Star,
  ArrowRight,
  Menu,
  X,
  Database,
  Users,
  Ticket,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* ─── Navbar ─────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-nano flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">น้องนาโน</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-600 hover:text-nano-500 transition-colors">
                ฟีเจอร์
              </a>
              <Link
                href="/login-platform"
                className="text-sm text-gray-600 hover:text-nano-500 transition-colors"
              >
                สำหรับผู้ให้บริการ
              </Link>
              <Link href="/register" className="btn-primary text-sm !px-5 !py-2">
                เริ่มทดลองใช้ฟรี
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white animate-slide-up">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-gray-600 py-2">ฟีเจอร์</a>
              <Link href="/login-platform" className="block text-gray-600 py-2">
                สำหรับผู้ให้บริการ
              </Link>
              <Link href="/register" className="btn-primary w-full text-center mt-2">
                เริ่มทดลองใช้ฟรี
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ─── Hero Section ───────────────────────────────────── */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-mesh" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-nano-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-nano-50 border border-nano-200 text-nano-600 text-sm font-medium mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              <span>ระบบ Service Ticket ยุคใหม่ สำหรับองค์กรไทย</span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6 animate-slide-up">
              <span className="text-transparent bg-clip-text bg-gradient-nano">น้องนาโน</span>
              <br />
              ระบบ Service Ticket อัจฉริยะ
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.1s" }}>
              แจ้งปัญหาผ่าน LINE, จัดการงานตามแผนก, AI ตอบคำถาม —
              ทุกอย่างในที่เดียว
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <Link
                href="/register"
                className="btn-primary text-base !px-8 !py-3 group"
              >
                เริ่มทดลองใช้ฟรี 14 วัน
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#features"
                className="btn-ghost text-base !px-8 !py-3"
              >
                ดูฟีเจอร์ทั้งหมด
              </a>
            </div>

            <p className="text-sm text-gray-400 mt-4 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              ไม่ต้องใส่บัตรเครดิต • ตั้งค่าเสร็จภายใน 2 นาที
            </p>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-16 max-w-5xl mx-auto animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <div className="glass-card p-2 sm:p-4 shadow-glass-lg">
              <div className="bg-gray-50 rounded-xl p-6 sm:p-8 border border-gray-100">
                {/* Mock Dashboard */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <div className="flex-1 bg-gray-200 rounded-full h-6 max-w-xs mx-auto" />
                </div>

                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Ticket ทั้งหมด", value: "156", color: "bg-blue-500" },
                    { label: "กำลังดำเนินการ", value: "23", color: "bg-amber-500" },
                    { label: "แก้ไขแล้ว", value: "118", color: "bg-emerald-500" },
                    { label: "รอดำเนินการ", value: "15", color: "bg-purple-500" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                      <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                      <div className={`w-full h-1.5 rounded-full ${stat.color} opacity-20 mt-2`}>
                        <div className={`h-full rounded-full ${stat.color}`} style={{ width: "70%" }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  {[
                    { no: "#001", title: "อินเตอร์เน็ตช้ามาก ชั้น 3", status: "กำลังดำเนินการ", statusColor: "bg-amber-100 text-amber-700" },
                    { no: "#002", title: "เครื่องพิมพ์ชั้น 2 พิมพ์ไม่ออก", status: "เปิด", statusColor: "bg-blue-100 text-blue-700" },
                    { no: "#003", title: "ลืมรหัสผ่านอีเมลบริษัท", status: "แก้ไขแล้ว", statusColor: "bg-emerald-100 text-emerald-700" },
                  ].map((ticket) => (
                    <div key={ticket.no} className="flex items-center gap-4 bg-white rounded-lg p-3 border border-gray-100">
                      <span className="text-sm font-mono text-nano-500 font-bold">{ticket.no}</span>
                      <span className="flex-1 text-sm text-gray-700">{ticket.title}</span>
                      <span className={`badge ${ticket.statusColor}`}>{ticket.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features Section ───────────────────────────────── */}
      <section id="features" className="py-20 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              ทุกอย่างที่องค์กรต้องการ
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              ระบบจัดการ Service Ticket ครบวงจร ออกแบบมาสำหรับองค์กรไทยโดยเฉพาะ
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: MessageSquare,
                title: "LINE Login & แจ้งปัญหาผ่าน LINE",
                desc: "ล็อกอินด้วย LINE ไม่ต้องจำรหัสผ่าน แจ้งปัญหาผ่านแชทได้ทันที",
                color: "bg-emerald-50 text-emerald-600",
              },
              {
                icon: Building2,
                title: "ระบบแผนกอัจฉริยะ",
                desc: "แบ่ง IT, HR, Finance แต่ละแผนกจัดการ ticket ของตัวเอง พร้อมหัวหน้าแผนก",
                color: "bg-blue-50 text-blue-600",
              },
              {
                icon: Bot,
                title: "AI น้องนาโน",
                desc: "ถามข้อมูลผ่าน LINE ด้วย AI — ตรวจสอบสถิติ ค้นหา ticket อัจฉริยะ",
                color: "bg-purple-50 text-purple-600",
              },
              {
                icon: Shield,
                title: "Multi-tenant SaaS",
                desc: "ขายให้หลายองค์กร แต่ละองค์กรมี workspace แยก ข้อมูลไม่ปนกัน",
                color: "bg-amber-50 text-amber-600",
              },
              {
                icon: BarChart3,
                title: "รายงานและสถิติ",
                desc: "กราฟเปรียบเทียบ ticket แต่ละแผนก เวลาแก้ไขเฉลี่ย ประสิทธิภาพทีม",
                color: "bg-cyan-50 text-cyan-600",
              },
              {
                icon: Database,
                title: "Dedicated Database",
                desc: "แผน Enterprise ได้ database แยก ข้อมูลปลอดภัยสูงสุด ย้ายได้ทุกเมื่อ",
                color: "bg-red-50 text-red-600",
              },
            ].map((feature) => (
              <div key={feature.title} className="card-hover group">
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ───────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              เริ่มต้นง่ายๆ 3 ขั้นตอน
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "สมัครและตั้งค่า",
                desc: "กรอกชื่อองค์กร เลือก subdomain ทดลองใช้ฟรี 14 วัน ไม่ต้องใส่บัตรเครดิต",
                icon: Zap,
              },
              {
                step: "02",
                title: "เชื่อมต่อ LINE OA",
                desc: "เชื่อมต่อ LINE Official Account ให้พนักงานแจ้งปัญหาผ่าน LINE ได้ทันที",
                icon: MessageSquare,
              },
              {
                step: "03",
                title: "เริ่มใช้งาน",
                desc: "พนักงานแจ้งปัญหา IT รับงาน หัวหน้าดูรายงาน — ทุกอย่างอัตโนมัติ",
                icon: Ticket,
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-nano text-white text-2xl font-bold mb-6 shadow-nano">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing Section (hidden — จะเปิดใช้ภายหลัง) ──── */}
      {/* <section id="pricing">...</section> */}

      {/* ─── CTA Section ────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-nano rounded-3xl p-12 sm:p-16 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/4 translate-y-1/4" />
            </div>
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                พร้อมเริ่มต้นหรือยัง?
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
                เริ่มทดลองใช้ฟรี 14 วัน ตั้งค่าเสร็จภายใน 2 นาที
                ไม่ต้องใส่บัตรเครดิต
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-nano-600 bg-white hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                เริ่มทดลองใช้ฟรี
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-nano flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">น้องนาโน</span>
              <span className="text-sm text-gray-400 ml-2">
                ระบบ Service Ticket อัจฉริยะ
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-900 transition-colors">นโยบายความเป็นส่วนตัว</a>
              <a href="#" className="hover:text-gray-900 transition-colors">เงื่อนไขการใช้งาน</a>
              <a href="#" className="hover:text-gray-900 transition-colors">ติดต่อเรา</a>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-gray-400">
            © {new Date().getFullYear()} น้องนาโน. สงวนลิขสิทธิ์.
          </div>
        </div>
      </footer>
    </div>
  );
}
