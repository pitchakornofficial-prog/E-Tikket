"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "./theme-provider";
import { SunIcon, MoonIcon } from "./icons";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 p-2 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 opacity-60 inline-flex items-center justify-center ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "เปลี่ยนเป็นธีมสว่าง (Light mode)" : "เปลี่ยนเป็นธีมมืด (Dark mode)"}
      title={isDark ? "สลับเป็นธีมสว่าง (Light mode)" : "สลับเป็นธีมมืด (Dark mode)"}
      className={`inline-flex items-center justify-center p-2 rounded-lg border transition-all cursor-pointer select-none active:scale-95 ${
        isDark
          ? "border-neutral-800 bg-neutral-900 text-amber-300 hover:text-white hover:bg-neutral-800 hover:border-neutral-700"
          : "border-neutral-300 bg-neutral-100 text-neutral-800 hover:text-black hover:bg-neutral-200 hover:border-neutral-400"
      } ${className}`}
    >
      {isDark ? (
        <SunIcon className="w-4 h-4 text-amber-300" />
      ) : (
        <MoonIcon className="w-4 h-4 text-neutral-800" />
      )}
    </button>
  );
}
