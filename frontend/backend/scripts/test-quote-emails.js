/**
 * Sends sample emails matching production quote flow (customer ack + workshop copy).
 *
 * Usage:
 *   cd frontend/backend
 *   node scripts/test-quote-emails.js [recipient@email.com]
 *
 * If omitted, uses WORKSHOP_QUOTE_EMAIL from .env (or first arg).
 * Requires real SMTP_* in .env (not smtp.example.com placeholders).
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const nodemailer = require("nodemailer");

async function main() {
  const to = process.argv[2] || process.env.WORKSHOP_QUOTE_EMAIL;
  if (!to) {
    console.error("Usage: node scripts/test-quote-emails.js you@example.com");
    process.exit(1);
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("Missing SMTP_HOST, SMTP_USER, or SMTP_PASS in frontend/backend/.env");
    process.exit(1);
  }
  if (String(process.env.SMTP_HOST).includes("example.com")) {
    console.error(
      "SMTP_HOST still looks like a placeholder. Set real values (e.g. smtp.gmail.com) and an app password, then run again."
    );
    process.exit(1);
  }

  const garage =
    process.env.JOB_SHEET_GARAGE_NAME || process.env.REMINDER_GARAGE_NAME || process.env.SMTP_FROM || "Our workshop";
  const from = process.env.SMTP_FROM || "noreply@carcare.com";
  const fakeId = "507f1f77bcf86cd799439011";

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const customerBody = `Hi Test Customer,\n\nThank you — we have received your quotation request.\n\nWe will review your details and get back to you with a quotation. You can also check status anytime using "Track quote" on our website with your reference and email.\n\n--- Reference ---\nRequest ID: ${fakeId}\n\n--- What you sent ---\nVehicle: Hatchback · Maruti Suzuki Swift (2022)\nService:\nBasic service package\nDetails / notes: (sample)\n\nParts / notes: —\n\n— ${garage}`;

  const workshopBody = `New quotation request\n\nID: ${fakeId}\nName: Test Customer\nEmail: ${to}\nPhone: 9999999999\n\nVehicle:\nHatchback · Maruti Suzuki Swift (2022)\n\nService:\nBasic service package\n\nParts / replacement notes:\n—\n`;

  console.log(`Sending test emails to ${to} …`);

  await transporter.sendMail({
    from,
    to,
    subject: `[TEST] We received your quotation request — ${String(fakeId).slice(-8)}`,
    text: `[This is a test from scripts/test-quote-emails.js]\n\n${customerBody}`,
  });
  console.log("  ✓ Customer-style acknowledgment sent.");

  await transporter.sendMail({
    from,
    to,
    subject: `[TEST] New quote request ${fakeId} — Test Customer`,
    text: `[This is a test from scripts/test-quote-emails.js]\n\n${workshopBody}`,
  });
  console.log("  ✓ Workshop-style notification sent.");
  console.log("Done.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
