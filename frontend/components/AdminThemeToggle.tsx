"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "admin-theme";

function applyTheme(mode: "light" | "dark") {
  document.documentElement.classList.toggle("dark", mode === "dark");
}

type ThemeToggleProps = {
  /** Icon-only square button for toolbars; default is full-width sidebar style */
  variant?: "default" | "icon";
};

export default function AdminThemeToggle({ variant = "default" }: ThemeToggleProps) {
  const [mode, setMode] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored ?? (prefersDark ? "dark" : "light");
    setMode(initial);
    applyTheme(initial);
  }, []);

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next: "light" | "dark" = prev === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  if (mode === null) {
    return (
      <div
        className={variant === "icon" ? "h-11 w-11 shrink-0" : "h-9 w-full rounded-xl border border-transparent px-3"}
        aria-hidden
      >
        <span className="sr-only">Theme</span>
      </div>
    );
  }

  const sun = (
    <svg className="h-5 w-5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.886-1.591 1.591M21 12h-2.25m-.236 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  );
  const moon = (
    <svg className="h-5 w-5 shrink-0 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
  );

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        aria-pressed={mode === "dark"}
        aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {mode === "dark" ? sun : moon}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
      aria-pressed={mode === "dark"}
    >
      {mode === "dark" ? sun : moon}
      {mode === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
