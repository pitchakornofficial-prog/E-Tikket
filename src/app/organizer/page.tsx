import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { OrganizerScanner } from "@/components/organizer-scanner";

export default function OrganizerPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white font-sans flex flex-col transition-colors duration-200 selection:bg-white selection:text-black">
      {/* Header */}
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/organizer" className="flex items-center gap-2 text-white font-bold tracking-wider text-lg uppercase">
            <span>TICKETBOX</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-400 text-black font-mono font-bold">SCANNER</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-400 font-mono hidden sm:inline">
              Organizer Panel
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-6 w-full space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            ระบบสแกนบัตรเข้างาน (QR Scanner & Re-entry)
          </h1>
          <p className="text-xs text-neutral-400">
            สแกน QR Code จากบัตรของผู้เข้าร่วมงานเพื่อตรวจสอบสิทธิ์เข้างานและออกชั่วคราว
          </p>
        </div>

        <OrganizerScanner />
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-6 text-center text-xs text-neutral-600 font-mono">
        <p>E-Tikket Organizer Scanner • TICKETBOX MVP</p>
      </footer>
    </div>
  );
}
