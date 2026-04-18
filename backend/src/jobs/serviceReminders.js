const nodemailer = require("nodemailer");
const cron = require("node-cron");
const { buildCustomerDirectory } = require("../utils/customerDirectory");
const SentServiceReminder = require("../models/SentServiceReminder");

async function processDueServiceReminders() {
  const { customers, today } = await buildCustomerDirectory({});
  const garage =
    process.env.REMINDER_GARAGE_NAME ||
    process.env.JOB_SHEET_GARAGE_NAME ||
    "Our garage";
  const siteUrl = (process.env.REMINDER_SITE_URL || process.env.PUBLIC_SITE_URL || "").trim();

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[reminders] SMTP not configured — skip automated reminders.");
    return { sent: 0, skipped: 0, today, reason: "no_smtp" };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const c of customers) {
    if (!c.nextServiceDueDate || c.nextServiceDueDate !== today) continue;
    if (!c.reminderAnchor) continue;

    const existing = await SentServiceReminder.findOne({
      emailNorm: c.emailNorm,
      reminderDate: c.nextServiceDueDate,
    });
    if (existing) {
      skipped++;
      continue;
    }

    const body =
      `Dear ${c.customerName},\n\n` +
      `This is a friendly reminder from ${garage}.\n` +
      `Based on your last ${c.reminderAnchor.serviceName} on ${c.reminderAnchor.servicedOn}, ` +
      `your next recommended service is due on ${c.nextServiceDueDate}.\n\n` +
      (siteUrl ? `Book online: ${siteUrl}\n\n` : "") +
      `If you already have an appointment, please ignore this message.\n\n` +
      `Best regards,\n${garage}`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@carcare.com",
      to: c.email,
      subject: `${garage} — your next service is due`,
      text: body,
    });

    await SentServiceReminder.create({
      emailNorm: c.emailNorm,
      reminderDate: c.nextServiceDueDate,
    });
    sent++;
  }

  if (sent || skipped) {
    console.log(`[reminders] ${today}: sent ${sent}, already notified ${skipped}`);
  }
  return { sent, skipped, today };
}

function startServiceReminderCron() {
  if (process.env.ENABLE_SERVICE_REMINDERS !== "true") {
    console.log("[reminders] Disabled — set ENABLE_SERVICE_REMINDERS=true in backend/.env for daily emails.");
    return;
  }
  const expr = process.env.REMINDER_CRON || "0 8 * * *";
  cron.schedule(expr, () => {
    processDueServiceReminders().catch((e) => console.error("[reminders]", e));
  });
  console.log(`[reminders] Cron scheduled (${expr}, server local time).`);
}

module.exports = { processDueServiceReminders, startServiceReminderCron };
