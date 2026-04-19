const nodemailer = require("nodemailer");
const AdminLoginEvent = require("../models/AdminLoginEvent");
const { getClientIp, describeLocationFromIp } = require("./clientRequestMeta");

function smtpPassword() {
  return String(process.env.SMTP_PASS || "").replace(/\s+/g, "");
}

function resolveAlertRecipients(adminDoc) {
  const fromEnv = process.env.ADMIN_LOGIN_ALERT_EMAIL;
  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const workshop = process.env.JOB_SHEET_EMAIL;
  if (workshop && String(workshop).trim()) return [String(workshop).trim()];
  const adminSeed = process.env.ADMIN_EMAIL;
  if (adminSeed && String(adminSeed).trim()) return [String(adminSeed).trim()];
  if (adminDoc?.email) return [String(adminDoc.email).trim()];
  return [];
}

function formatWhen() {
  const tz = process.env.ADMIN_LOGIN_ALERT_TIMEZONE || process.env.WORKSHOP_TIMEZONE || "UTC";
  const now = new Date();
  try {
    const local = now.toLocaleString("en-GB", {
      timeZone: tz,
      dateStyle: "full",
      timeStyle: "long",
    });
    return { isoUtc: now.toISOString(), localLine: `${local} (${tz})` };
  } catch (_e) {
    return { isoUtc: now.toISOString(), localLine: `${now.toISOString()} (UTC)` };
  }
}

function readUserAgent(req) {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua.slice(0, 500) : "";
}

/**
 * Collect IP, geo label, and timestamps for a successful admin login.
 */
async function gatherAdminLoginContext(req) {
  const ip = getClientIp(req);
  const locationLabel = await describeLocationFromIp(ip);
  const { isoUtc, localLine } = formatWhen();
  const userAgent = readUserAgent(req);
  return { ip, locationLabel, isoUtc, localLine, userAgent };
}

async function sendAdminLoginEmail(adminDoc, ctx) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !smtpPassword()) {
    console.warn("[admin-login-alert] SMTP not configured — skip login notification email.");
    return;
  }

  const to = resolveAlertRecipients(adminDoc);
  if (to.length === 0) {
    console.warn("[admin-login-alert] No recipient — set ADMIN_LOGIN_ALERT_EMAIL, JOB_SHEET_EMAIL, or ADMIN_EMAIL.");
    return;
  }

  const subject = `Admin sign-in: ${adminDoc?.email || "admin"}`;
  const text = [
    "Someone signed in to the admin panel.",
    "",
    `Account: ${adminDoc?.name || "Admin"} <${adminDoc?.email || "?"}>`,
    `When (UTC): ${ctx.isoUtc}`,
    `When (your configured timezone): ${ctx.localLine}`,
    `Location / network: ${ctx.locationLabel}`,
    `Client IP: ${ctx.ip || "(unknown)"}`,
    `User-Agent: ${ctx.userAgent || "(none)"}`,
    "",
    "If this was not you, change the admin password and review workshop access.",
  ].join("\n");

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: smtpPassword(),
    },
  });

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@carcare.com";

  await transporter.sendMail({
    from,
    to: to.join(", "),
    subject,
    text,
  });
}

/**
 * Persist login row, then send optional alert email. Does not throw to callers.
 */
async function processAdminLoginFollowUp(req, adminDoc) {
  let ctx;
  try {
    ctx = await gatherAdminLoginContext(req);
  } catch (err) {
    console.error("[admin-login] gather context", err?.message || err);
    const ip = getClientIp(req);
    const { isoUtc, localLine } = formatWhen();
    ctx = {
      ip,
      locationLabel: "Unknown",
      isoUtc,
      localLine,
      userAgent: readUserAgent(req),
    };
  }

  try {
    await AdminLoginEvent.create({
      userId: adminDoc._id,
      email: String(adminDoc.email),
      name: adminDoc.name ? String(adminDoc.name) : "",
      at: new Date(),
      ip: ctx.ip || "",
      locationLabel: ctx.locationLabel || "",
      userAgent: ctx.userAgent || "",
      isoUtc: ctx.isoUtc || "",
      timezoneLine: ctx.localLine || "",
    });
  } catch (err) {
    console.error("[admin-login] persist event", err?.message || err);
  }

  try {
    await sendAdminLoginEmail(adminDoc, ctx);
  } catch (err) {
    console.error("[admin-login-alert]", err?.message || err);
  }
}

module.exports = {
  gatherAdminLoginContext,
  processAdminLoginFollowUp,
};
