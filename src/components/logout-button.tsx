"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (response.ok) {
        router.push("/login");
        router.refresh();
      } else {
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="px-3 py-1.5 text-xs font-medium border border-neutral-700 bg-neutral-900 text-neutral-200 rounded hover:bg-neutral-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 transition-colors"
    >
      {isLoading ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
    </button>
  );
}
