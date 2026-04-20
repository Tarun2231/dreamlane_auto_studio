"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SITE_HOME_STATS } from "@/lib/site";

type ParsedStat =
  | { kind: "numeric"; target: number; prefix: string; suffix: string; decimals: number }
  | { kind: "text"; value: string };

function parseStat(raw: string): ParsedStat {
  const value = raw.trim();
  const m = value.match(/^([^\d-]*)(\d+(?:\.\d+)?)([kKmM]?)(\+?)(.*)$/);
  if (!m) return { kind: "text", value };

  const [, prefix, numStr, unit, plus, trailing] = m;
  const num = Number(numStr);
  if (!Number.isFinite(num)) return { kind: "text", value };

  return {
    kind: "numeric",
    target: num,
    prefix: prefix ?? "",
    suffix: `${unit ?? ""}${plus ?? ""}${trailing ?? ""}`,
    decimals: numStr.includes(".") ? 1 : 0,
  };
}

function AnimatedStatValue({ value }: { value: string }) {
  const parsed = useMemo(() => parseStat(value), [value]);
  const [current, setCurrent] = useState(0);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [pulseOn, setPulseOn] = useState(false);
  const ref = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (parsed.kind !== "numeric") return;
    if (typeof window === "undefined") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setCurrent(parsed.target);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [parsed]);

  useEffect(() => {
    if (parsed.kind !== "numeric" || !started) return;

    const duration = 1100;
    const start = performance.now();
    let raf = 0;

    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = parsed.target * eased;
      setCurrent(next);
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setCompleted(true);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [parsed, started]);

  useEffect(() => {
    if (!completed) return;
    setPulseOn(true);
    const t = setTimeout(() => setPulseOn(false), 900);
    return () => clearTimeout(t);
  }, [completed]);

  if (parsed.kind === "text") {
    return (
      <p ref={ref} className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
        {parsed.value}
      </p>
    );
  }

  const shown = started ? current : 0;
  return (
    <div className="relative inline-flex items-center justify-center">
      <span
        aria-hidden
        className={`pointer-events-none absolute h-12 w-20 rounded-full bg-amber-400/25 blur-xl transition-opacity duration-500 dark:bg-amber-500/20 ${
          pulseOn ? "opacity-100" : "opacity-0"
        }`}
      />
      <p ref={ref} className="relative text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
        {parsed.prefix}
        {shown.toFixed(parsed.decimals)}
        {parsed.suffix}
      </p>
    </div>
  );
}

export default function HomeStatsStrip() {
  return (
    <section className="border-b border-zinc-200/70 bg-zinc-950/[0.03] py-10 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ul className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8">
          {SITE_HOME_STATS.map((s) => (
            <li key={s.label} className="text-center">
              <AnimatedStatValue value={s.value} />
              <p className="mt-1 text-[13px] font-medium leading-snug text-zinc-500 dark:text-zinc-400">{s.label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
