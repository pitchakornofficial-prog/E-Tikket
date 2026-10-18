"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface PrototypeControlBarProps {
  firstEventId?: string;
}

export function PrototypeControlBar({ firstEventId }: PrototypeControlBarProps) {
  const pathname = usePathname();

  return (
    <div className="prototype-bar">
      <div className="prototype-meta">
        <span className="prototype-tag">PHAT PROTOTYPE</span>
        <span className="prototype-note">9-Page Architecture</span>
        <span>
          Page: <strong>{pathname === "/" ? "1. Home (Catalog)" : pathname}</strong>
        </span>
        <span>
          ID: <strong>home-v6</strong>
        </span>
      </div>
      <nav className="prototype-nav overflow-x-auto max-w-full">
        <Link href="/" className={pathname === "/" ? "active" : ""}>
          1. Home
        </Link>
        {firstEventId && (
          <Link
            href={`/events/${firstEventId}`}
            className={pathname.startsWith("/events") ? "active" : ""}
          >
            2. Detail
          </Link>
        )}
        <Link
          href="/my-tickets"
          className={pathname.startsWith("/my-tickets") ? "active" : ""}
        >
          3. Lookup
        </Link>
        <Link
          href="/news"
          className={pathname.startsWith("/news") ? "active" : ""}
        >
          4. News
        </Link>
        <span style={{ color: "#555" }}>|</span>
        <Link
          href="/admin"
          className={pathname === "/admin" ? "active" : ""}
        >
          A1. Dashboard
        </Link>
        <Link
          href="/admin/events"
          className={pathname.startsWith("/admin/events") ? "active" : ""}
        >
          A4. Event Approval
        </Link>
        <Link
          href="/admin/verifications"
          className={pathname.startsWith("/admin/verifications") ? "active" : ""}
        >
          A5. Verifications
        </Link>
        <span style={{ color: "#555" }}>|</span>
        <Link
          href="/organizer"
          className={pathname === "/organizer" ? "active" : ""}
        >
          O1. Org Dash
        </Link>
        <Link
          href="/organizer/events"
          className={pathname.startsWith("/organizer/events") ? "active" : ""}
        >
          O2. My Events
        </Link>
        <Link
          href="/organizer/orders"
          className={pathname.startsWith("/organizer/orders") ? "active" : ""}
        >
          O3. Attendees
        </Link>
        <Link
          href="/organizer/scanner"
          className={pathname.startsWith("/organizer/scanner") ? "active" : ""}
        >
          O4. Gate Token
        </Link>
      </nav>
    </div>
  );
}
