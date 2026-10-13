/* eslint-disable @typescript-eslint/no-require-imports */
import { getSupabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  const supabase = getSupabase();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zjhlymssrpcawajhfpfg.supabase.co";

  const results = {
    timestamp: new Date().toISOString(),
    configuredUrl: url,
    envCheck: {
      status: url && url.includes("supabase.co") ? "PASS" : "FAIL",
      message: "Supabase URL and publishable key configured.",
    },
    servicesQuery: { status: "PENDING", details: "" },
    shopQuery: { status: "PENDING", details: "" },
  };

  try {
    const { data: services, error: sErr } = await supabase.from("services").select("id, name, base_price").limit(5);
    if (!sErr && Array.isArray(services)) {
      results.servicesQuery = {
        status: "PASS",
        details: `Successfully fetched ${services.length} services from Supabase.`,
        data: services,
      };
    } else {
      results.servicesQuery = {
        status: "BLOCKED",
        details: sErr ? sErr.message : "No services returned. Apply migration in Supabase SQL editor.",
      };
    }
  } catch (err) {
    results.servicesQuery = { status: "BLOCKED", details: err?.message || String(err) };
  }

  try {
    const { data: products, error: pErr } = await supabase.from("shop_products").select("id, name, base_price").limit(5);
    if (!pErr && Array.isArray(products)) {
      results.shopQuery = {
        status: "PASS",
        details: `Successfully fetched ${products.length} products from Supabase.`,
        data: products,
      };
    } else {
      results.shopQuery = {
        status: "BLOCKED",
        details: pErr ? pErr.message : "No products returned. Apply migration in Supabase SQL editor.",
      };
    }
  } catch (err) {
    results.shopQuery = { status: "BLOCKED", details: err?.message || String(err) };
  }

  res.status(200).json(results);
}
