"use client";

/* eslint-disable react-hooks/set-state-in-effect -- sync theme from storage on mount */
import { useEffect, useState } from "react";

const STORAGE_KEY = "carcare-theme";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initial = stored === "dark" || (!stored && prefersDark);
    setDark(initial);
    document.documentElement.classList.toggle("dark", initial);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-lg shadow-sm transition hover:bg-black/5 dark:border-white/15 dark:bg-zinc-800 dark:hover:bg-zinc-700"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
