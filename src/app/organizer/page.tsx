import { OrganizerNav } from "@/components/organizer-nav";
import { OrganizerScanner } from "@/components/organizer-scanner";

export default function OrganizerPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white font-sans flex flex-col transition-colors duration-200 selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
      <OrganizerNav />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-6 w-full space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
            ระบบสแกนบัตรเข้างาน (QR Scanner & Re-entry)
          </h1>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            สแกน QR Code จากบัตรของผู้เข้าร่วมงานเพื่อตรวจสอบสิทธิ์เข้างานและออกชั่วคราว
          </p>
        </div>

        <OrganizerScanner />
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-900 py-6 text-center text-xs text-neutral-500 dark:text-neutral-600 font-mono">
        <p>E-Tikket Organizer Scanner • TICKETBOX MVP</p>
      </footer>
    </div>
  );
}
