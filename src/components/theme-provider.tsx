"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyThemeToDOM(t: Theme) {
  const root = document.documentElement;
  if (t === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    // 1. Initial sync with DOM state established by layout.tsx script
    const currentIsDark = document.documentElement.classList.contains("dark");
    const currentTheme: Theme = currentIsDark ? "dark" : "light";
    setThemeState(currentTheme);
    applyThemeToDOM(currentTheme);

    // 2. Listen to system preference changes in real-time
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = (e: MediaQueryListEvent) => {
      const nextTheme: Theme = e.matches ? "dark" : "light";
      setThemeState(nextTheme);
      localStorage.setItem("theme", nextTheme);
      applyThemeToDOM(nextTheme);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleMediaChange);
    } else if ("addListener" in mediaQuery) {
      // Fallback for older Safari
      (mediaQuery as unknown as { addListener: (cb: (e: MediaQueryListEvent) => void) => void }).addListener(handleMediaChange);
    }

    // 3. Listen to cross-tab storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "theme" && (e.newValue === "dark" || e.newValue === "light")) {
        setThemeState(e.newValue);
        applyThemeToDOM(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleMediaChange);
      } else if ("removeListener" in mediaQuery) {
        (mediaQuery as unknown as { removeListener: (cb: (e: MediaQueryListEvent) => void) => void }).removeListener(handleMediaChange);
      }
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("theme", newTheme);
    } catch {}
    applyThemeToDOM(newTheme);
  };

  const toggleTheme = () => {
    // Toggle based on the active DOM class so it never goes out of sync
    const isCurrentlyDark = document.documentElement.classList.contains("dark");
    const nextTheme: Theme = isCurrentlyDark ? "light" : "dark";
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
