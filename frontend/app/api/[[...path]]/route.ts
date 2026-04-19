import { NextRequest, NextResponse } from "next/server";

/** Express base URL (server-side only — browser never talks to this directly). */
const BACKEND = (process.env.BACKEND_URL || "http://127.0.0.1:5000").replace(/\/$/, "");

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

async function proxy(req: NextRequest, params: Promise<{ path?: string[] }>) {
  const { path } = await params;
  const segments = path ?? [];
  const pathname = segments.length > 0 ? `/api/${segments.join("/")}` : "/api";
  const target = `${BACKEND}${pathname}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "host" || HOP_BY_HOP.has(lower)) return;
    headers.set(key, value);
  });

  /** Prefer a single client IP for the Express API (admin login alerts, etc.). */
  const clientHint =
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "";
  if (clientHint) {
    headers.set("x-forwarded-for", clientHint);
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };

  if (!["GET", "HEAD"].includes(req.method)) {
    init.body = await req.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch {
    return NextResponse.json(
      {
        message:
          "Backend unreachable. From the repository root run: npm run dev (starts Next + Express). Or npm run dev:api — MongoDB must be running.",
      },
      { status: 502 }
    );
  }

  const resHeaders = new Headers(upstream.headers);
  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(req, ctx.params);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(req, ctx.params);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(req, ctx.params);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(req, ctx.params);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(req, ctx.params);
}

export async function OPTIONS(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(req, ctx.params);
}
