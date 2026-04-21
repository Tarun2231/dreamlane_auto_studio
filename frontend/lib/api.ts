import axios from "axios";

/**
 * API is served from Next.js at same-origin `/api/...` (Vercel-compatible).
 */
const SERVER_API_BASE =
  process.env.INTERNAL_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  `${process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000"}/api`;

const SERVER_API_ROOT = SERVER_API_BASE.replace(/\/?$/, "/");

/** Use in Server Components: `fetch(\`${API_BASE}/services\`)` */
export const API_BASE = SERVER_API_BASE;

function normalizeUrl(url?: string) {
  if (!url) return url;
  return url.startsWith("/") ? url.slice(1) : url;
}

function clientApiRoot(): string {
  if (typeof window === "undefined") return SERVER_API_ROOT;
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.replace(/\/?$/, "/");
  if (fromEnv) return fromEnv;
  return `${window.location.origin}/api/`;
}

function clientAdminRoot(): string {
  if (typeof window === "undefined") return `${SERVER_API_ROOT}admin/`;
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.replace(/\/?$/, "/");
  if (fromEnv) return `${fromEnv}admin/`;
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
