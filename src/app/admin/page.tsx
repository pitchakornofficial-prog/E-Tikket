import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { ClipboardCheckIcon, MusicIcon, ArrowRightIcon } from "@/components/icons";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      <AdminNav />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-10 w-full space-y-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">แผงควบคุมผู้ดูแลระบบ (Admin)</h1>
          <p className="text-neutral-400 text-sm mt-1">
            ศูนย์กลางการจัดการระบบขายบัตร ตรวจสอบสลิปโอนเงิน และมอบหมายงานคอนเสิร์ต
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Verifications */}
          <div className="p-6 border border-neutral-800 rounded-xl bg-neutral-950 space-y-4 hover:border-neutral-700 transition-colors flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300">
                <ClipboardCheckIcon className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">ตรวจสอบการชำระเงิน</h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                เทียบข้อมูลคำสั่งซื้อกับภาพสลิปโอนเงิน อนุมัติเพื่อออกบัตร QR Code ทางอีเมลอัตโนมัติ หรือปฏิเสธเพื่อคืนสต็อกตั๋ว
              </p>
            </div>
            <div>
              <Link
                href="/admin/verifications"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-black text-xs font-bold rounded hover:bg-neutral-200 transition-colors"
              >
                <span>ไปยังหน้าตรวจสอบสลิป</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Events Management */}
          <div className="p-6 border border-neutral-800 rounded-xl bg-neutral-950 space-y-4 hover:border-neutral-700 transition-colors flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300">
                <MusicIcon className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">จัดการคอนเสิร์ต & ผู้จัดงาน</h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                เพิ่มคอนเสิร์ตใหม่ กำหนดหมวดหมู่ วันที่ สถานที่ ราคา และมอบหมายให้ผู้จัดงาน (Organizer) ดูแลสแกนบัตรเฉพาะงานของตน
              </p>
            </div>
            <div>
              <Link
                href="/admin/events"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-black text-xs font-bold rounded hover:bg-neutral-200 transition-colors"
              >
                <span>ไปยังหน้าจัดการคอนเสิร์ต</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-neutral-900 py-6 text-center text-xs text-neutral-600">
        <p>E-Tikket Admin Portal • MVP</p>
      </footer>
    </div>
  );
}
