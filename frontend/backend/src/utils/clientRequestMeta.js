/**
 * Best-effort client IP (works with optional Express trust proxy + reverse proxies).
 */
function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) {
    return xf.split(",")[0].trim();
  }
  if (typeof xf === "string") return String(xf).trim();
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) return realIp.trim();
  const cf = req.headers["cf-connecting-ip"];
  if (typeof cf === "string" && cf.trim()) return cf.trim();
  return req.ip || req.socket?.remoteAddress || "";
}

function normalizeIpForChecks(ip) {
  if (!ip) return "";
  let s = String(ip).trim();
  if (s.startsWith("::ffff:")) s = s.slice(7);
  return s;
}

function isPrivateOrLocalIp(ip) {
  const v = normalizeIpForChecks(ip);
  if (!v) return true;
  if (v === "::1" || v === "127.0.0.1") return true;
  if (v.startsWith("10.")) return true;
  if (v.startsWith("192.168.")) return true;
  if (v.startsWith("169.254.")) return true;
  if (v.startsWith("172.")) {
    const second = Number(v.split(".")[1]);
    if (!Number.isNaN(second) && second >= 16 && second <= 31) return true;
  }
  if (v.includes(":")) {
    if (v.toLowerCase().startsWith("fc") || v.toLowerCase().startsWith("fd")) return true;
    if (v === "::1") return true;
  }
  return false;
}

/**
 * Human-readable place line from IP (free ip-api.com HTTP API, no key).
 * Falls back to IP-only or local-network wording on failure / private IPs.
 */
async function describeLocationFromIp(ip) {
  const raw = normalizeIpForChecks(ip);
  if (!raw) return "Unknown address";

  if (raw === "127.0.0.1" || raw === "::1") {
    return "Local (this machine)";
  }
  if (isPrivateOrLocalIp(raw)) {
    return `Private network (${raw})`;
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 4500);
  try {
    const url = `http://ip-api.com/json/${encodeURIComponent(raw)}?fields=status,message,country,regionName,city,query`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return `Unknown (${raw})`;
    const data = await res.json();
    if (data.status !== "success") {
      return data.message ? `${data.message} (${raw})` : `Unknown (${raw})`;
    }
    const parts = [data.city, data.regionName, data.country].filter(Boolean);
    const place = parts.length ? parts.join(", ") : data.country || raw;
    return `${place} — IP ${data.query || raw}`;
  } catch (_e) {
    return `Approximate location unavailable (${raw})`;
  } finally {
    clearTimeout(t);
  }
}

module.exports = {
  getClientIp,
  describeLocationFromIp,
};
