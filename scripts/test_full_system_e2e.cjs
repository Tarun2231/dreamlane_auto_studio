/**
 * Automated End-to-End Test Suite for Dreamlane Auto Studio
 * Tests Supabase Connectivity, Data Normalization, Admin Services, Offline/Online Toggling,
 * Booking Flow, Status Transitions, and Financial P&L Synchronization.
 */

const path = require("path");
const { createClient } = require(path.join(__dirname, "../frontend/node_modules/@supabase/supabase-js"));
const jwt = require(path.join(__dirname, "../frontend/node_modules/jsonwebtoken"));

const SUPABASE_URL = "https://zjhlvmssrpcawajhfpfg.supabase.co";
const SUPABASE_KEY = "sb_publishable_VU8pJ3utws5oeU8meFcAHg_bstYju59";
const BASE_URL = "http://127.0.0.1:3000";
const JWT_SECRET = "dreamlane-secret-jwt-key-2026-secure-token";

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTests() {
  console.log("================================================================================");
  console.log("DREAMLANE AUTO STUDIO — END-TO-END SYSTEM INTEGRATION TEST SUITE");
  console.log("================================================================================\n");

  let adminToken = "";
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@carcare.com", password: "admin123" }),
    });
    if (loginRes.ok) {
      const loginData = await loginRes.json();
      adminToken = loginData.token;
      console.log("[AUTH] Admin login successful. Token acquired.\n");
    } else {
      console.warn("[AUTH] Admin login returned status", loginRes.status);
    }
  } catch (authErr) {
    console.error("[AUTH] Failed to login:", authErr.message);
  }

  let passed = 0;
  let failed = 0;

  function report(name, success, details = "") {
    if (success) {
      console.log(`[PASS] ${name}`);
      if (details) console.log(`       ${details}`);
      passed++;
    } else {
      console.log(`[FAIL] ${name}`);
      if (details) console.log(`       ERROR: ${details}`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Supabase Connectivity & Table Schemas
  // ---------------------------------------------------------------------------
  try {
    const { data: services, error: sErr } = await sb.from("services").select("id, name, is_active").limit(5);
    const { data: bookings, error: bErr } = await sb.from("bookings").select("id, customer_name, status").limit(5);
    
    if (sErr || bErr) {
      report("TEST 1: Supabase Connectivity & Schema Inspection", false, sErr?.message || bErr?.message);
    } else {
      report(
        "TEST 1: Supabase Connectivity & Schema Inspection",
        true,
        `Connected to ${SUPABASE_URL}. Found ${services.length} services, ${bookings.length} bookings in Supabase.`
      );
    }
  } catch (err) {
    report("TEST 1: Supabase Connectivity & Schema Inspection", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Admin Service Management (Create & Verify in Supabase)
  // ---------------------------------------------------------------------------
  let createdServiceId = null;
  const testServiceName = `E2E Full Ceramic Treatment ${Date.now().toString().slice(-4)}`;
  try {
    const res = await fetch(`${BASE_URL}/api/admin/service`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: testServiceName,
        description: "Automated E2E comprehensive 9H ceramic coating service",
        basePrice: 8500,
        duration: 180,
        followUpMonths: 12,
        isActive: true,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      report("TEST 2: Admin Service Creation", false, `HTTP ${res.status}: ${txt}`);
    } else {
      const data = await res.json();
      createdServiceId = data._id || data.id;

      // Verify directly in Supabase
      const { data: supaCheck, error: supaErr } = await sb
        .from("services")
        .select("*")
        .eq("id", createdServiceId)
        .maybeSingle();

      if (supaErr || !supaCheck) {
        report("TEST 2: Admin Service Creation", false, `Service created in app but missing in Supabase: ${supaErr?.message}`);
      } else {
        report(
          "TEST 2: Admin Service Creation",
          true,
          `Service '${data.name}' created with Supabase UUID ${createdServiceId}. Base Price: ₹${supaCheck.base_price}, Active: ${supaCheck.is_active}`
        );
      }
    }
  } catch (err) {
    report("TEST 2: Admin Service Creation", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Online / Offline Status Synchronization
  // ---------------------------------------------------------------------------
  try {
    if (!createdServiceId) throw new Error("Skipping TEST 3: No test service available.");

    // 1. Toggle to OFFLINE
    const offRes = await fetch(`${BASE_URL}/api/admin/service/${createdServiceId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: false }),
    });

    if (!offRes.ok) throw new Error(`Failed to toggle service offline: HTTP ${offRes.status}`);

    // Verify customer public endpoint excludes it
    const pubRes1 = await fetch(`${BASE_URL}/api/services`);
    const pubServices1 = await pubRes1.json();
    const isExcluded = !pubServices1.some((s) => (s._id === createdServiceId || s.id === createdServiceId));

    // Try booking offline service - should be rejected with 400
    const bookOffRes = await fetch(`${BASE_URL}/api/booking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: createdServiceId,
        vehicleType: "Sedan",
        date: "2026-10-25",
        time: "10:00",
        customerName: "Offline Tester",
        phone: "9988776655",
        email: "offlinetest@example.com",
        carMake: "Honda",
        carModel: "Civic",
        vehicleYear: 2023,
      }),
    });

    const isBookingBlocked = bookOffRes.status === 400;

    // 2. Toggle back to ONLINE
    const onRes = await fetch(`${BASE_URL}/api/admin/service/${createdServiceId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: true }),
    });
    if (!onRes.ok) throw new Error(`Failed to toggle service online: HTTP ${onRes.status}`);

    const pubRes2 = await fetch(`${BASE_URL}/api/services`);
    const pubServices2 = await pubRes2.json();
    const isIncluded = pubServices2.some((s) => (s._id === createdServiceId || s.id === createdServiceId));

    if (isExcluded && isBookingBlocked && isIncluded) {
      report(
        "TEST 3: Online / Offline Status Synchronization",
        true,
        "Offline service was immediately excluded from customer API, booking was blocked (400), and re-enabling restored it."
      );
    } else {
      report(
        "TEST 3: Online / Offline Status Synchronization",
        false,
        `isExcluded=${isExcluded}, isBookingBlocked=${isBookingBlocked}, isIncluded=${isIncluded}`
      );
    }
  } catch (err) {
    report("TEST 3: Online / Offline Status Synchronization", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Customer Booking Flow (Insertion & Field Mapping)
  // ---------------------------------------------------------------------------
  let createdBookingId = null;
  try {
    if (!createdServiceId) throw new Error("No service available for booking test.");

    const bookingPayload = {
      serviceId: createdServiceId,
      vehicleType: "SUV",
      date: "2026-10-28",
      time: "14:00",
      customerName: "Priya Sharma",
      phone: "+91 98450 12345",
      email: "priya.sharma@example.com",
      carMake: "Hyundai",
      carModel: "Creta",
      vehicleYear: 2024,
      chassisNumber: "MALCH81VLP1234567",
      registrationNumber: "TS09EA1234",
    };

    const bookRes = await fetch(`${BASE_URL}/api/booking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingPayload),
    });

    if (!bookRes.ok) {
      const errTxt = await bookRes.text();
      throw new Error(`Booking submission failed (HTTP ${bookRes.status}): ${errTxt}`);
    }

    const bookingData = await bookRes.json();
    createdBookingId = bookingData._id || bookingData.id;

    // Verify in Supabase
    const { data: supaBooking, error: sbErr } = await sb
      .from("bookings")
      .select("*")
      .eq("id", createdBookingId)
      .maybeSingle();

    if (sbErr || !supaBooking) {
      report("TEST 4: Customer Booking Flow", false, `Booking created in app but missing in Supabase: ${sbErr?.message}`);
    } else {
      report(
        "TEST 4: Customer Booking Flow",
        true,
        `Booking created. Supabase ID: ${createdBookingId}, customer_name='${supaBooking.customer_name}', car_make='${supaBooking.car_make}', status='${supaBooking.status}'`
      );
    }
  } catch (err) {
    report("TEST 4: Customer Booking Flow", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Admin Booking Retrieval & Field Normalization
  // ---------------------------------------------------------------------------
  try {
    if (!createdBookingId) throw new Error("No booking to retrieve.");

    const res = await fetch(`${BASE_URL}/api/admin/bookings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = await res.json();
    const found = list.find((b) => b._id === createdBookingId || b.id === createdBookingId);

    if (!found) {
      report("TEST 5: Admin Booking Retrieval", false, "Newly created booking not found in admin bookings list.");
    } else {
      const hasCamelCase = Boolean(found.customerName && found.carMake && found.carModel && found.serviceId?.name);
      const hasSnakeCase = Boolean(found.customer_name && found.car_make && found.car_model);
      const safeId = Boolean(found._id && found._id.length > 5);

      if (hasCamelCase && hasSnakeCase && safeId) {
        report(
          "TEST 5: Admin Booking Retrieval & Normalization",
          true,
          `Booking retrieved without crashes. customerName='${found.customerName}', serviceId.name='${found.serviceId?.name}', vehicleType='${found.vehicleType}'`
        );
      } else {
        report(
          "TEST 5: Admin Booking Retrieval & Normalization",
          false,
          `Field normalization incomplete: camelCase=${hasCamelCase}, snakeCase=${hasSnakeCase}`
        );
      }
    }
  } catch (err) {
    report("TEST 5: Admin Booking Retrieval & Normalization", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Booking Status Updates
  // ---------------------------------------------------------------------------
  try {
    if (!createdBookingId) throw new Error("No booking to update.");

    // Update to "In Progress"
    const st1 = await fetch(`${BASE_URL}/api/admin/booking/status/${createdBookingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "In Progress" }),
    });
    if (!st1.ok) throw new Error(`Status update to In Progress failed: HTTP ${st1.status}`);

    // Update to "Completed"
    const st2 = await fetch(`${BASE_URL}/api/admin/booking/status/${createdBookingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "Completed" }),
    });
    if (!st2.ok) throw new Error(`Status update to Completed failed: HTTP ${st2.status}`);

    // Verify status via admin get
    const checkRes = await fetch(`${BASE_URL}/api/admin/bookings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const checkList = await checkRes.json();
    const verified = checkList.find((b) => b._id === createdBookingId || b.id === createdBookingId);

    if (verified?.status === "Completed") {
      report("TEST 6: Booking Status Transitions", true, "Booking successfully transitioned Pending -> In Progress -> Completed.");
    } else {
      report("TEST 6: Booking Status Transitions", false, `Expected Completed, got ${verified?.status}`);
    }
  } catch (err) {
    report("TEST 6: Booking Status Transitions", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 7: Payment & P&L Synchronization
  // ---------------------------------------------------------------------------
  try {
    if (!createdBookingId) throw new Error("No booking for payment test.");

    const payRes = await fetch(`${BASE_URL}/api/admin/booking/${createdBookingId}/payment-pl`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        finalAmount: 8500,
        partsCostInr: 2000,
        miscCostsInr: 500,
        paymentStatus: "paid",
        paymentMethod: "UPI",
        paymentReference: "UPI-TXN-9876543210",
        paymentReceivedYmd: "2026-10-28",
      }),
    });

    if (!payRes.ok) throw new Error(`Payment update failed: HTTP ${payRes.status}`);
    const updated = await payRes.json();

    const expectedProfit = 8500 - 2000 - 500; // 6000
    if (updated.finalAmount === 8500 && updated.paymentStatus === "paid") {
      report(
        "TEST 7: Financial Synchronization (Payment & P&L)",
        true,
        `Payment saved. Final Amount: ₹${updated.finalAmount}, Payment Status: ${updated.paymentStatus}, Method: ${updated.paymentMethod}. Estimated Job Profit: ₹${expectedProfit}`
      );
    } else {
      report("TEST 7: Financial Synchronization (Payment & P&L)", false, `Unexpected data: ${JSON.stringify(updated)}`);
    }
  } catch (err) {
    report("TEST 7: Financial Synchronization (Payment & P&L)", false, err.message);
  }

  // Clean up test service and booking
  try {
    if (createdServiceId) {
      await fetch(`${BASE_URL}/api/admin/service/${createdServiceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      await sb.from("services").delete().eq("id", createdServiceId);
    }
    if (createdBookingId) {
      await sb.from("bookings").delete().eq("id", createdBookingId);
    }
  } catch {
    // Cleanup errors are non-fatal
  }

  console.log("\n================================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed})`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
