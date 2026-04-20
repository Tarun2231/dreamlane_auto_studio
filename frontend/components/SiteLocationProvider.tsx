"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getInitialSiteLocation, SITE_LOCATION_OPTIONS } from "@/lib/site";

const STORAGE_KEY = "car-service:site-location";

const OPTIONS = SITE_LOCATION_OPTIONS as readonly string[];

type SiteLocationContextValue = {
  location: string;
  setLocation: (next: string) => void;
  options: typeof SITE_LOCATION_OPTIONS;
};

const SiteLocationContext = createContext<SiteLocationContextValue | null>(null);

export function SiteLocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocationState] = useState(() => getInitialSiteLocation());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && OPTIONS.includes(raw)) setLocationState(raw);
    } catch {
      /* ignore */
    }
  }, []);

  const setLocation = useCallback((next: string) => {
    if (!OPTIONS.includes(next)) return;
    setLocationState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ location, setLocation, options: SITE_LOCATION_OPTIONS }),
    [location, setLocation]
  );

  return <SiteLocationContext.Provider value={value}>{children}</SiteLocationContext.Provider>;
}

export function useSiteLocation() {
  const ctx = useContext(SiteLocationContext);
  if (!ctx) throw new Error("useSiteLocation must be used under SiteLocationProvider");
  return ctx;
}
