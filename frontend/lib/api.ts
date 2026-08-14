import axios from "axios";

/**
 * API is served from Next.js at same-origin `/api/...` (Vercel-compatible).
 */
export function getServerApiBase(): string {
  if (process.env.INTERNAL_API_BASE) return process.env.INTERNAL_API_BASE.replace(/\/?$/, "");
  if (process.env.NEXT_PUBLIC_API_BASE) return process.env.NEXT_PUBLIC_API_BASE.replace(/\/?$/, "");
  const base = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (base) return `${base.replace(/\/?$/, "")}/api`;
  const port = process.env.PORT || "3000";
  return `http://127.0.0.1:${port}/api`;
}

const SERVER_API_BASE = getServerApiBase();
const SERVER_API_ROOT = `${SERVER_API_BASE.replace(/\/?$/, "")}/`;

/** Use in Server Components: `fetchServerApi('/services')` or `fetch(\`${API_BASE}/services\`)` */
export const API_BASE = SERVER_API_BASE;

/**
 * Resilient fetch helper for Server Components that handles dev port variations.
 */
export async function fetchServerApi(endpoint: string, init?: RequestInit): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const primaryBase = getServerApiBase();
  const primaryUrl = `${primaryBase}${cleanEndpoint}`;

  try {
    const res = await fetch(primaryUrl, init);
    return res;
  } catch (error) {
    if (
      process.env.NODE_ENV === "development" &&
      (primaryUrl.includes("127.0.0.1") || primaryUrl.includes("localhost"))
    ) {
      const fallbackPorts = ["3001", "3000", "3002"].filter((p) => !primaryUrl.includes(`:${p}`));
      for (const fallbackPort of fallbackPorts) {
        try {
          const fallbackUrl = `http://127.0.0.1:${fallbackPort}/api${cleanEndpoint}`;
          const res = await fetch(fallbackUrl, init);
          return res;
        } catch {
          // continue fallback
        }
      }
    }
    throw error;
  }
}

function normalizeUrl(url?: string) {
  if (!url) return url;
  return url.startsWith("/") ? url.slice(1) : url;
}

function clientApiRoot(): string {
  if (typeof window === "undefined") return SERVER_API_ROOT;
  // In browser, always use same-origin API to avoid stale/misconfigured public env vars.
  return `${window.location.origin}/api/`;
}

function clientAdminRoot(): string {
  if (typeof window === "undefined") return `${SERVER_API_ROOT}admin/`;
  // In browser, always use same-origin admin API for reliability on Vercel.
  return `${window.location.origin}/api/admin/`;
}

export const api = axios.create({
  baseURL: SERVER_API_ROOT,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    config.baseURL = clientApiRoot();
  }
  config.url = normalizeUrl(config.url);
  return config;
});

export const adminApi = axios.create({
  baseURL: `${SERVER_API_ROOT}admin/`,
});

adminApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    config.baseURL = clientAdminRoot();
  }
  config.url = normalizeUrl(config.url);
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("adminToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (typeof window !== "undefined" && status === 401) {
      localStorage.removeItem("adminToken");
      if (!window.location.pathname.startsWith("/admin/login")) {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(err);
  }
);
