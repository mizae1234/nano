"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Building2,
  MessageSquare,
  Database,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Bot,
  Palette,
  Save,
  RotateCcw,
} from "lucide-react";

// ─── Bot Config Form ──────────────────────────────────────────
function BotConfigSection() {
  const [config, setConfig] = useState({
    botName: "น้องนาโน",
    botPersona: "ค่ะ",
    themeColor: "#0066FF",
    welcomeMessage: "สวัสดีค่ะ ยินดีต้อนรับสู่ระบบ Service Ticket 🎉\nพิมพ์ \"ช่วย\" เพื่อดูเมนูการใช้งานค่ะ",
    menuMessage: "เลือกสิ่งที่ต้องการค่ะ 😊",
    triggerWords: "นาโน,@นาโน,nano,@nano",
    systemPrompt: "",
    aiModel: "gemini-2.5-flash-preview-05-20",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/bot/config")
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          botName: data.botName || "น้องนาโน",
          botPersona: data.botPersona || "ค่ะ",
          themeColor: data.themeColor || "#0066FF",
          welcomeMessage: data.welcomeMessage || "",
          menuMessage: data.menuMessage || "",
          triggerWords: data.triggerWords || "นาโน,@นาโน,nano,@nano",
          systemPrompt: data.systemPrompt || "",
          aiModel: data.aiModel || "gemini-2.5-flash-preview-05-20",
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/bot/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const previewMsg = (msg: string) =>
    msg
      .replace("{botName}", config.botName)
      .replace("{persona}", config.botPersona);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-nano-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Persona */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Bot className="w-5 h-5 text-nano-500" />
          ตัวตนของบอท
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="input-label">ชื่อบอท</label>
            <input
              type="text"
              className="input-field"
              value={config.botName}
              onChange={(e) => setConfig({ ...config, botName: e.target.value })}
              placeholder="น้องนาโน"
            />
          </div>
          <div>
            <label className="input-label">ลงท้ายข้อความ (Persona)</label>
            <select
              className="input-field"
              value={config.botPersona}
              onChange={(e) => setConfig({ ...config, botPersona: e.target.value })}
            >
              <option value="ค่ะ">ค่ะ (ผู้หญิง/ทางการ)</option>
              <option value="ครับ">ครับ (ผู้ชาย/ทางการ)</option>
              <option value="จ้า">จ้า (เป็นกันเอง)</option>
              <option value="นะ">นะ (เป็นกันเอง)</option>
              <option value="">— ไม่มีลงท้าย</option>
            </select>
          </div>
          <div>
            <label className="input-label">สีธีมบอท</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                value={config.themeColor}
                onChange={(e) => setConfig({ ...config, themeColor: e.target.value })}
              />
              <input
                type="text"
                className="input-field !w-32 font-mono"
                value={config.themeColor}
                onChange={(e) => setConfig({ ...config, themeColor: e.target.value })}
              />
              <div
                className="w-10 h-10 rounded-lg border border-gray-100 shadow-sm"
                style={{ backgroundColor: config.themeColor }}
              />
            </div>
          </div>
          {/* AI Model fixed to gemini-2.5-flash-preview-05-20 — hidden from UI */}
          <input type="hidden" value="gemini-2.5-flash-preview-05-20" onChange={() => {}} />
        </div>
      </div>

      {/* Trigger Words */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-nano-500" />
          คำเรียกบอทใน Group Chat
        </h2>
        <p className="text-xs text-gray-400 mb-4">คั่นด้วยเครื่องหมายจุลภาค เช่น นาโน,@นาโน,nano</p>
        <input
          type="text"
          className="input-field font-mono"
          value={config.triggerWords}
          onChange={(e) => setConfig({ ...config, triggerWords: e.target.value })}
          placeholder="นาโน,@นาโน,nano,@nano"
        />
        <div className="flex flex-wrap gap-2 mt-3">
          {config.triggerWords.split(",").filter(Boolean).map((w, i) => (
            <span key={i} className="badge bg-nano-50 text-nano-600 font-mono text-xs">
              {w.trim()}
            </span>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-nano-500" />
          ข้อความอัตโนมัติ
        </h2>
        <div className="space-y-4">
          <div>
            <label className="input-label">ข้อความต้อนรับ (เมื่อ follow OA)</label>
            <textarea
              className="input-field h-24 resize-none"
              value={config.welcomeMessage}
              onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
            />
            <p className="text-xs text-gray-400 mt-1">
              Preview: <span className="text-gray-600">{previewMsg(config.welcomeMessage).split("\n")[0]}</span>
            </p>
          </div>
          <div>
            <label className="input-label">ข้อความใต้เมนูหลัก</label>
            <input
              type="text"
              className="input-field"
              value={config.menuMessage}
              onChange={(e) => setConfig({ ...config, menuMessage: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* System Prompt */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Bot className="w-5 h-5 text-nano-500" />
          System Prompt (AI)
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          ปรับแต่ง persona ของ AI เมื่อตอบคำถาม — ถ้าเว้นว่างจะใช้ default prompt ของน้องนาโน
        </p>
        <textarea
          className="input-field h-40 resize-none font-mono text-xs"
          value={config.systemPrompt}
          onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
          placeholder={`คุณคือ "${config.botName}" ผู้ช่วย AI ของระบบ Service Ticket\nคุณตอบเป็นภาษาไทย ลงท้ายด้วย "${config.botPersona}"\n...`}
        />
        {config.systemPrompt && (
          <button
            className="btn-ghost text-xs mt-2 text-gray-400"
            onClick={() => setConfig({ ...config, systemPrompt: "" })}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            รีเซ็ตเป็น default
          </button>
        )}
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary disabled:opacity-60"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />กำลังบันทึก...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" />บันทึกการตั้งค่า</>
          )}
        </button>
        {saved && (
          <div className="flex items-center gap-2 text-emerald-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            บันทึกสำเร็จแล้ว
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LINE OA Section ──────────────────────────────────────────
function LineOASection() {
  const [lineToken, setLineToken] = useState("");
  const [lineSecret, setLineSecret] = useState("");
  const [lineStatus, setLineStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [lineMsg, setLineMsg] = useState("");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nano.technomand-ai.cloud";
  const webhookUrl = `${appUrl}/api/webhook/line`;

  const handleTest = async () => {
    setLineStatus("testing");
    setLineMsg("");
    try {
      const res = await fetch("/api/tenant/line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelAccessToken: lineToken, channelSecret: lineSecret, testOnly: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setLineStatus("success");
        setLineMsg(data.message || "เชื่อมต่อสำเร็จ");
      } else {
        setLineStatus("error");
        setLineMsg(data.error || "เชื่อมต่อไม่สำเร็จ");
      }
    } catch {
      setLineStatus("error");
      setLineMsg("เกิดข้อผิดพลาด");
    }
  };

  const handleSave = async () => {
    const res = await fetch("/api/tenant/line", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelAccessToken: lineToken, channelSecret: lineSecret }),
    });
    const data = await res.json();
    if (res.ok) {
      setLineStatus("success");
      setLineMsg(data.message);
    }
  };

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-gray-400" />
        เชื่อมต่อ LINE OA
      </h2>
      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 mb-4">
        <div className="text-xs text-gray-500 mb-1">Webhook URL (ใส่ใน LINE Developers Console)</div>
        <div className="flex items-center gap-2">
          <code className="text-sm text-nano-600 bg-nano-50 px-2 py-1 rounded font-mono flex-1 truncate">{webhookUrl}</code>
          <button className="btn-ghost text-xs !px-3" onClick={() => navigator.clipboard.writeText(webhookUrl)}>คัดลอก</button>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="input-label">Channel Access Token</label>
          <input type="password" className="input-field" placeholder="กรอก Channel Access Token" value={lineToken} onChange={(e) => setLineToken(e.target.value)} />
        </div>
        <div>
          <label className="input-label">Channel Secret</label>
          <input type="password" className="input-field" placeholder="กรอก Channel Secret" value={lineSecret} onChange={(e) => setLineSecret(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm" onClick={handleTest} disabled={!lineToken || !lineSecret || lineStatus === "testing"}>
            {lineStatus === "testing" ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />ทดสอบ...</> : "ทดสอบการเชื่อมต่อ"}
          </button>
          <button className="btn-primary text-sm" disabled={lineStatus !== "success"} onClick={handleSave}>บันทึก</button>
        </div>
        {lineMsg && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${lineStatus === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {lineStatus === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {lineMsg}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState<"bot" | "line" | "db">("bot");

  const tabs = [
    { id: "bot" as const, label: "🤖 Bot Config", icon: Bot },
    { id: "line" as const, label: "💬 LINE OA", icon: MessageSquare },
    { id: "db" as const, label: "🗄️ Database", icon: Database },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" />
          ตั้งค่าระบบ
        </h1>
        <p className="text-sm text-gray-400 mt-1">จัดการการตั้งค่าทั้งหมดขององค์กร</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "bot" && <BotConfigSection />}
      {tab === "line" && <LineOASection />}
      {tab === "db" && (
        <div className="card border-2 border-dashed border-amber-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-500" />
            ย้ายข้อมูลไป Dedicated Database
          </h2>
          <p className="text-sm text-gray-500 mb-4">เฉพาะแผน Enterprise — ย้ายข้อมูลทั้งหมดไปยัง PostgreSQL แยก</p>
          <div className="space-y-4">
            <div>
              <label className="input-label">Dedicated Database URL</label>
              <input type="text" className="input-field" placeholder="postgresql://user:pass@host:5432/dbname" />
            </div>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 text-amber-700 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>การย้ายข้อมูลจะทำในพื้นหลัง ข้อมูลเดิมจะถูกเก็บไว้จนกว่าจะย้ายสำเร็จ 100%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
