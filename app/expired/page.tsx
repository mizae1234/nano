"use client";

import Link from "next/link";
import { Bot, ArrowUpCircle, Clock, MessageCircle } from "lucide-react";

export default function ExpiredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-gradient-mesh px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-100 mb-6">
          <Clock className="w-10 h-10 text-amber-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          ทดลองใช้งานหมดอายุแล้ว
        </h1>
        <p className="text-gray-600 mb-8">
          ช่วงทดลองใช้งาน 14 วันของคุณสิ้นสุดแล้ว
          อัปเกรดแผนเพื่อใช้งานต่อได้เลยค่ะ
        </p>

        <div className="card space-y-4 mb-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50 border border-blue-100">
            <div className="text-left">
              <div className="font-semibold text-gray-900">Starter</div>
              <div className="text-sm text-gray-600">20 ผู้ใช้ • 500 Ticket/เดือน</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-nano-500">฿990</div>
              <div className="text-xs text-gray-400">/เดือน</div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-purple-50 border border-purple-100">
            <div className="text-left">
              <div className="font-semibold text-gray-900">Pro ⭐</div>
              <div className="text-sm text-gray-600">ไม่จำกัด + AI น้องนาโน</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-purple-600">฿2,990</div>
              <div className="text-xs text-gray-400">/เดือน</div>
            </div>
          </div>

          <button className="btn-primary w-full !py-3">
            <ArrowUpCircle className="w-4 h-4 mr-2" />
            อัปเกรดตอนนี้
          </button>

          <button className="btn-ghost w-full text-sm">
            <MessageCircle className="w-4 h-4 mr-2" />
            ติดต่อทีมงาน (Enterprise)
          </button>
        </div>

        <p className="text-xs text-gray-400">
          ข้อมูลของคุณจะถูกเก็บไว้ 30 วัน หลังหมดอายุ
          <br />
          อัปเกรดเมื่อไหร่ก็ใช้ข้อมูลเดิมได้ทันที
        </p>
      </div>
    </div>
  );
}
