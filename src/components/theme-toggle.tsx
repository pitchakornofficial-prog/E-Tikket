"use client";

import React from "react";
import { useTheme } from "./theme-provider";
import { SunIcon, MoonIcon } from "./icons";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "เปลี่ยนเป็นธีมสว่าง (Light mode)" : "เปลี่ยนเป็นธีมมืด (Dark mode)"}
      title={theme === "dark" ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด"}
      className={`inline-flex items-center justify-center p-2 rounded-lg border transition-colors ${
        theme === "dark"
          ? "border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800"
          : "border-neutral-300 bg-neutral-100 text-neutral-700 hover:text-black hover:bg-neutral-200"
      } ${className}`}
    >
      {theme === "dark" ? (
        <SunIcon className="w-4 h-4 text-amber-300" />
      ) : (
        <MoonIcon className="w-4 h-4 text-neutral-800" />
      )}
    </button>
  );
}
