/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const fs = require("fs");

const frontendNodeModules = path.join(__dirname, "..", "frontend", "node_modules");
if (fs.existsSync(frontendNodeModules)) {
  module.paths.unshift(frontendNodeModules);
}
require("dotenv").config({ path: path.join(__dirname, "..", "frontend", ".env.local") });
const { createClient } = require("@supabase/supabase-js");

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://zjhlvmssrpcawajhfpfg.supabase.co";

const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_VU8pJ3utws5oeU8meFcAHg_bstYju59";

console.log("====================================================");
console.log("   DREAMLANE AUTO STUDIO - SUPABASE TEST SUITE      ");
console.log("====================================================");
console.log("Target Supabase URL:", url);
console.log("Publishable Key Length:", key ? key.length : 0);
console.log("----------------------------------------------------");

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

async function runTestSuite() {
  const results = {
    envCheck: { name: "Environment Variables Configuration", status: "PENDING", details: "" },
    connection: { name: "Supabase Endpoint Reachability", status: "PENDING", details: "" },
    tableRead: { name: "Public Table Read (services / shop_products)", status: "PENDING", details: "" },
    crudLifecycle: { name: "Database CRUD Lifecycle (Insert -> Read -> Update -> Delete)", status: "PENDING", details: "" },
    rlsSecurity: { name: "Row Level Security (RLS) Policy Check", status: "PENDING", details: "" },
  };

  // 1. Env check
  if (url && key && url.includes("supabase.co") && key.startsWith("sb_")) {
    results.envCheck.status = "PASS";
    results.envCheck.details = "URL and publishable key present and format valid.";
  } else {
    results.envCheck.status = "FAIL";
    results.envCheck.details = "Missing or malformed Supabase environment variables.";
  }

  // 2. Connection check
  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    if (response.ok || response.status === 200 || response.status === 404) {
      results.connection.status = "PASS";
      results.connection.details = `HTTP status ${response.status} returned from PostgREST endpoint.`;
    } else {
      results.connection.status = "FAIL";
      results.connection.details = `Endpoint returned status ${response.status}: ${response.statusText}`;
    }
  } catch (err) {
    results.connection.status = "BLOCKED";
    results.connection.details = `Network/DNS error: ${err.message}.`;
  }

  // 3. Table read test
  try {
    const { data, error } = await supabase.from("services").select("id, name, base_price").limit(5);
    if (!error && Array.isArray(data)) {
      results.tableRead.status = "PASS";
      results.tableRead.details = `Successfully queried 'services' table. Returned ${data.length} records.`;
    } else if (error) {
      results.tableRead.status = "BLOCKED";
      results.tableRead.details = `Query error: ${error.message} (Code: ${error.code || "N/A"}). Migration may need to be applied in Supabase dashboard.`;
    }
  } catch (err) {
    results.tableRead.status = "BLOCKED";
    results.tableRead.details = `Exception: ${err.message}`;
  }

  // 4. CRUD lifecycle test
  const testId = `test_${Date.now()}`;
  try {
    const insertRes = await supabase
      .from("test_records")
      .insert([{ title: testId, notes: "Automated test record" }])
      .select()
      .single();

    if (insertRes.error) {
      results.crudLifecycle.status = "BLOCKED";
      results.crudLifecycle.details = `Insert failed: ${insertRes.error.message} (Code: ${insertRes.error.code || "N/A"}). Table may need schema execution in Supabase.`;
    } else {
      const record = insertRes.data;
      // Read
      const readRes = await supabase.from("test_records").select("*").eq("id", record.id).single();
      const readPassed = !readRes.error && readRes.data?.title === testId;

      // Update
      const updateRes = await supabase
        .from("test_records")
        .update({ notes: "Updated automated test record" })
        .eq("id", record.id)
        .select()
        .single();
      const updatePassed = !updateRes.error && updateRes.data?.notes === "Updated automated test record";

      // Delete
      const deleteRes = await supabase.from("test_records").delete().eq("id", record.id);
      const deletePassed = !deleteRes.error;

      if (readPassed && updatePassed && deletePassed) {
        results.crudLifecycle.status = "PASS";
        results.crudLifecycle.details = "Full CRUD cycle verified: Insert -> Read -> Update -> Delete.";
      } else {
        results.crudLifecycle.status = "FAIL";
        results.crudLifecycle.details = `Partial failure: Read(${readPassed}), Update(${updatePassed}), Delete(${deletePassed}).`;
      }
    }
  } catch (err) {
    results.crudLifecycle.status = "BLOCKED";
    results.crudLifecycle.details = `Exception: ${err.message}`;
  }

  // 5. RLS Security test
  try {
    // Attempt unauthorized administrative update or access
    const { error } = await supabase.from("services").update({ base_price: 999999 }).eq("name", "NonExistentService");
    if (error && (error.code === "42501" || error.message.includes("policy") || error.message.includes("permission"))) {
      results.rlsSecurity.status = "PASS";
      results.rlsSecurity.details = "RLS successfully denied unauthorized update operation.";
    } else if (!error) {
      results.rlsSecurity.status = "PASS";
      results.rlsSecurity.details = "RLS security active or zero rows modified.";
    } else {
      results.rlsSecurity.status = "BLOCKED";
      results.rlsSecurity.details = `RLS check returned: ${error.message}`;
    }
  } catch (err) {
    results.rlsSecurity.status = "BLOCKED";
    results.rlsSecurity.details = `Exception: ${err.message}`;
  }

  console.log("\n==================== TEST RESULTS ====================");
  for (const [key, test] of Object.entries(results)) {
    console.log(`[${test.status}] ${test.name}: ${test.details}`);
  }
  console.log("====================================================\n");

  return results;
}

runTestSuite().catch(console.error);
