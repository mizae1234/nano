"use client";

import { useState, useEffect } from "react";
import { User, CreditCard, Building2, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface ProfileData {
  id: string;
  displayName: string;
  employeeCode: string | null;
  departmentId: string | null;
  pictureUrl: string | null;
  role: string;
}

interface Department {
  id: string;
  name: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, deptRes] = await Promise.all([
          fetch("/api/users/profile"),
          fetch("/api/departments"),
        ]);

        if (!profileRes.ok) {
          // If unauthenticated, redirect to login
          const tenantSlug = new URLSearchParams(window.location.search).get("tenant") || "demo";
          window.location.href = `/login?redirect=/profile&tenant=${tenantSlug}`;
          return;
        }

        const profileData = await profileRes.json();
        const deptData = await deptRes.json();

        setProfile(profileData);
        setDepartments(deptData || []);

        setDisplayName(profileData.displayName || "");
        setEmployeeCode(profileData.employeeCode || "");
        setDepartmentId(profileData.departmentId || "");
      } catch (err) {
        console.error("Error loading profile data:", err);
        setError("ไม่สามารถโหลดข้อมูลโปรไฟล์ได้ กรุณาลองใหม่อีกครั้ง");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("กรุณากรอกชื่อพนักงาน");
      return;
    }

    setError("");
    setSuccess(false);
    setSaving(true);

    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          employeeCode: employeeCode.trim() || null,
          departmentId: departmentId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        return;
      }

      setSuccess(true);
      
      // Auto close window if inside LIFF after 1.5 seconds
      setTimeout(() => {
        if (typeof window !== "undefined" && window.liff && window.liff.closeWindow) {
          window.liff.closeWindow();
        }
      }, 1500);
    } catch (err) {
      console.error("Save profile error:", err);
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-gradient-mesh px-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-nano-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">กำลังโหลดโปรไฟล์...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-gradient-mesh px-4 py-8">
      <div className="w-full max-w-md animate-fade-in">
        {/* Profile Card Wrapper */}
        <div className="glass-card shadow-xl overflow-hidden border border-white/40">
          
          {/* Cover / Header Gradient */}
          <div className="bg-gradient-nano h-28 relative flex items-center justify-center">
            <h1 className="text-white text-lg font-bold tracking-wide">ข้อมูลโปรไฟล์พนักงาน</h1>
          </div>

          {/* Profile Picture overlay */}
          <div className="flex justify-center -mt-10 relative z-10">
            {profile?.pictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.pictureUrl}
                alt={profile.displayName}
                className="w-20 h-20 rounded-full border-4 border-white object-cover shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-white bg-nano-100 flex items-center justify-center shadow-md">
                <User className="w-10 h-10 text-nano-600" />
              </div>
            )}
          </div>

          <div className="p-6 pt-4">
            {/* Status Messages */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-start gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs flex items-start gap-2 border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">บันทึกข้อมูลเรียบร้อยแล้วค่ะ</span>
                  <span className="text-[10px] text-emerald-600/80">ระบบจะทำการปิดหน้าต่างนี้โดยอัตโนมัติ...</span>
                </div>
              </div>
            )}

            {/* Edit Form */}
            <form onSubmit={handleSave} className="space-y-4">
              
              {/* Employee ID */}
              <div>
                <label className="input-label flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  รหัสพนักงาน (Employee ID)
                </label>
                <input
                  type="text"
                  placeholder="เช่น E001, 10023"
                  className="input-field"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                />
              </div>

              {/* Display Name */}
              <div>
                <label className="input-label flex items-center gap-1.5">
                  <User className="w-4 h-4 text-gray-400" />
                  ชื่อพนักงาน (Display Name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="กรอกชื่อ-นามสกุล หรือชื่อเรียก"
                  className="input-field"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>

              {/* Department */}
              <div>
                <label className="input-label flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  แผนก (Department)
                </label>
                <select
                  className="input-field"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                >
                  <option value="">-- ยังไม่สังกัดแผนก --</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      บันทึกข้อมูล
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* Footer branding */}
          <div className="bg-gray-50/50 px-6 py-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
            <span>Powered by น้องนาโน AI</span>
            <span>Service Ticket System</span>
          </div>

        </div>
      </div>
    </div>
  );
}
