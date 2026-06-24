"use client";

import { useState } from "react";
import { Settings, Building2, Palette, Link2, MessageSquare, Database, CheckCircle, Loader2, AlertTriangle, Shield } from "lucide-react";

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("บริษัททดสอบ จำกัด");
  const [themeColor, setThemeColor] = useState("#0066FF");
  const [lineToken, setLineToken] = useState("");
  const [lineSecret, setLineSecret] = useState("");
  const [dbUrl, setDbUrl] = useState("");
  const [lineStatus, setLineStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [dbStatus, setDbStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nano.technomand-ai.cloud";
  const webhookUrl = `${appUrl}/api/webhook/line`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Organization Info */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-400" />
          ข้อมูลองค์กร
        </h2>
        <div className="space-y-4">
          <div>
            <label className="input-label">ชื่อองค์กร</label>
            <input type="text" className="input-field" value={orgName} onChange={e => setOrgName(e.target.value)} />
          </div>
          <div>
            <label className="input-label">Logo URL</label>
            <input type="text" className="input-field" placeholder="https://..." />
          </div>
          <div>
            <label className="input-label">สีธีม</label>
            <div className="flex items-center gap-3">
              <input type="color" className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" value={themeColor} onChange={e => setThemeColor(e.target.value)} />
              <input type="text" className="input-field !w-32" value={themeColor} onChange={e => setThemeColor(e.target.value)} />
              <div className="w-32 h-10 rounded-lg" style={{ backgroundColor: themeColor }} />
            </div>
          </div>
          <button className="btn-primary text-sm">บันทึก</button>
        </div>
      </div>

      {/* LINE OA */}
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
            <input type="password" className="input-field" placeholder="กรอก Channel Access Token" value={lineToken} onChange={e => setLineToken(e.target.value)} />
          </div>
          <div>
            <label className="input-label">Channel Secret</label>
            <input type="password" className="input-field" placeholder="กรอก Channel Secret" value={lineSecret} onChange={e => setLineSecret(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary text-sm" onClick={() => setLineStatus("testing")} disabled={!lineToken || !lineSecret}>
              {lineStatus === "testing" ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />ทดสอบ...</> : "ทดสอบการเชื่อมต่อ"}
            </button>
            <button className="btn-primary text-sm" disabled={lineStatus !== "success"}>
              บันทึก
            </button>
          </div>

          {lineStatus === "success" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm">
              <CheckCircle className="w-4 h-4" />
              เชื่อมต่อสำเร็จ: LINE OA "น้องนาโนทดสอบ"
            </div>
          )}
        </div>
      </div>

      {/* Dedicated Database (Enterprise only) */}
      <div className="card border-2 border-dashed border-amber-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Database className="w-5 h-5 text-amber-500" />
          ย้ายข้อมูลไป Dedicated Database
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          เฉพาะแผน Enterprise — ย้ายข้อมูลทั้งหมดไปยัง PostgreSQL แยก
        </p>

        <div className="space-y-4">
          <div>
            <label className="input-label">Dedicated Database URL</label>
            <input type="text" className="input-field" placeholder="postgresql://user:pass@host:5432/dbname" value={dbUrl} onChange={e => setDbUrl(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary text-sm" disabled={!dbUrl} onClick={() => setDbStatus("testing")}>
              {dbStatus === "testing" ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />ทดสอบ...</> : "ทดสอบการเชื่อมต่อ"}
            </button>
            <button className="btn-primary text-sm bg-amber-500 hover:bg-amber-600" disabled={dbStatus !== "success"}>
              <Database className="w-4 h-4 mr-1.5" />
              เริ่มย้ายข้อมูล
            </button>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 text-amber-700 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>การย้ายข้อมูลจะทำในพื้นหลัง ข้อมูลเดิมจะถูกเก็บไว้จนกว่าจะย้ายสำเร็จ 100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
