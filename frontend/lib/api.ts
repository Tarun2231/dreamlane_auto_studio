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
  } catch {
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
    // Return safe fallback Response during static build or offline periods to prevent build failures
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
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

function isTokenTrulyExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const jsonStr = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(jsonStr);
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return false;
  }
}

adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (typeof window !== "undefined" && status === 401) {
      const currentToken = localStorage.getItem("adminToken");
      if (!currentToken || isTokenTrulyExpired(currentToken)) {
        localStorage.removeItem("adminToken");
        if (!window.location.pathname.startsWith("/admin/login")) {
          window.location.href = "/admin/login";
        }
      } else {
        console.warn("[adminApi] 401 received for endpoint:", err?.config?.url, "— preserving active admin session.");
      }
    }
    return Promise.reject(err);
  }
);
