const PDFDocument = require("pdfkit");
const Booking = require("../models/Booking");
const JobCard = require("../models/JobCard");

function getInvoiceBrand() {
  const prefix = process.env.INVOICE_PREFIX || "INV";
  return {
    prefix,
    garageName: process.env.JOB_SHEET_GARAGE_NAME || process.env.INVOICE_GARAGE_NAME || "Blacklane Auto Studio",
    tagline: process.env.JOB_SHEET_TAGLINE || process.env.INVOICE_TAGLINE || "Premium car care",
    location: process.env.JOB_SHEET_LOCATION || "—",
    phone: process.env.JOB_SHEET_PHONE || "—",
    email: process.env.JOB_SHEET_EMAIL || "—",
    bankName: process.env.INVOICE_BANK_NAME || "—",
    bankAccount: process.env.INVOICE_BANK_ACCOUNT || "—",
    bankIfsc: process.env.INVOICE_BANK_IFSC || "—",
    footerNote: process.env.INVOICE_FOOTER_NOTE || "",
    dueDays: Number(process.env.INVOICE_DUE_DAYS || 0),
    discountInr: Number(process.env.INVOICE_DISCOUNT_INR || 0),
    discountPct: Number(process.env.INVOICE_DISCOUNT_PCT || 0),
  };
}

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

function formatDateDisplay(isoDateStr) {
  if (!isoDateStr) return "—";
  const d = new Date(isoDateStr + "T12:00:00");
  if (Number.isNaN(d.getTime())) return isoDateStr;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function dueDateFromBooking(dateStr, addDays) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T12:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + (Number.isFinite(addDays) ? addDays : 0));
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Dynamic invoice PDF: line items from service + job card, totals, bank block, notes.
 */
async function buildInvoicePdfBuffer(bookingId) {
  const booking = await Booking.findById(bookingId).populate("serviceId");
  if (!booking) {
    const err = new Error("Booking not found");
    err.statusCode = 404;
    throw err;
  }

  const jobCard = await JobCard.findOne({ bookingId: booking._id });
  const service = booking.serviceId;
  const brand = getInvoiceBrand();

  const basePrice = service?.basePrice ?? 0;
  const extra = jobCard?.extraCharges ?? 0;
  const subtotal = basePrice + extra;

  let discountAmt = brand.discountInr + (subtotal * brand.discountPct) / 100;
  if (!Number.isFinite(discountAmt) || discountAmt < 0) discountAmt = 0;
  if (discountAmt > subtotal) discountAmt = subtotal;

  const totalComputed = Math.max(0, subtotal - discountAmt);
  const finalAmt = booking.finalAmount > 0 ? booking.finalAmount : totalComputed;

  const year = new Date().getFullYear();
  const invNo = `${brand.prefix}-${year}-${String(booking._id).slice(-6).toUpperCase()}`;

  /** Table rows */
  const rows = [];
  if (service) {
    rows.push({
      desc: service.name,
      dur: `${service.duration} mins`,
      unit: basePrice,
      amt: basePrice,
    });
  }
  if (extra > 0) {
    const addOnLabel =
      (jobCard?.servicesDone || []).filter(Boolean).length > 0
        ? `Additional work: ${(jobCard.servicesDone || []).join(", ")}`
        : "Additional charges (parts / labour)";
    rows.push({
      desc: addOnLabel,
      dur: "—",
      unit: extra,
      amt: extra,
    });
  }
  if (rows.length === 0) {
    rows.push({ desc: "Service", dur: "—", unit: 0, amt: 0 });
  }

  const doc = new PDFDocument({ size: "A4", margin: 36, info: { Title: `Invoice ${invNo}`, Author: brand.garageName } });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));

  const endDoc = () =>
    new Promise((resolve, reject) => {
      doc.on("error", reject);
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.end();
    });

  const pageW = 523;
  const leftX = 36;
  let y = 36;
  const accent = "#e53935";
  const muted = "#555555";

  // —— HEADER ——
  const name = brand.garageName;
  const firstLetter = name.charAt(0);
  const restName = name.slice(1);
  doc.font("Helvetica-Bold").fontSize(22);
  doc.fillColor(accent).text(firstLetter, leftX, y);
  const firstW = doc.widthOfString(firstLetter);
  doc.fillColor("#111111").text(restName, leftX + firstW, y);
  doc.font("Helvetica").fontSize(9).fillColor("#777777").text(brand.tagline, leftX, y + 22, { width: 320 });

  doc.roundedRect(430, y, 100, 30, 8).fill("#222222");
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#ffffff").text("INVOICE", 430, y + 9, { width: 100, align: "center" });
  y += 48;

  doc.roundedRect(leftX, y, pageW, 36, 8).fill("#fafafa");
  doc.font("Helvetica").fontSize(9).fillColor(muted);
  doc.text(`${brand.location}   |   ${brand.phone}   |   ${brand.email}`, leftX + 12, y + 12, { width: pageW - 24 });
  y += 48;

  // —— BILL TO + INVOICE INFO ——
  const colW = (pageW - 16) / 2;
  const cardH = 102;
  doc.roundedRect(leftX, y, colW, cardH, 10).stroke("#eeeeee");
  doc.roundedRect(leftX + colW + 16, y, colW, cardH, 10).stroke("#eeeeee");

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#888888").text("Bill To", leftX + 14, y + 10);
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111111").text(booking.customerName, leftX + 14, y + 26, { width: colW - 28 });
  doc.font("Helvetica").fontSize(10).fillColor("#333333");
  doc.text(`Phone: ${booking.phone}`, leftX + 14, y + 42, { width: colW - 28 });
  doc.text(`Email: ${booking.email}`, leftX + 14, y + 56, { width: colW - 28 });
  const yr =
    booking.vehicleYear != null && Number.isFinite(Number(booking.vehicleYear))
      ? ` (${Number(booking.vehicleYear)})`
      : "";
  const vehLine = [booking.carMake, booking.carModel].filter(Boolean).join(" ").trim();
  const chassis =
    booking.chassisNumber || booking.registrationNumber
      ? ` · Chassis: ${booking.chassisNumber || booking.registrationNumber}`
      : "";
  doc.font("Helvetica").fontSize(8).fillColor(muted);
  doc.text(`Vehicle: ${vehLine || "—"}${yr}${chassis}`, leftX + 14, y + 72, { width: colW - 28 });

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#888888").text("Invoice Info", leftX + colW + 30, y + 10);
  doc.font("Helvetica").fontSize(10).fillColor("#333333");
  doc.text(`Invoice No: ${invNo}`, leftX + colW + 30, y + 26, { width: colW - 28 });
  doc.text(`Date: ${formatDateDisplay(booking.date)}`, leftX + colW + 30, y + 40, { width: colW - 28 });
  doc.text(`Due: ${dueDateFromBooking(booking.date, brand.dueDays)}`, leftX + colW + 30, y + 54, { width: colW - 28 });

  y += cardH + 20;

  // —— TABLE ——
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111111").text("Service details", leftX, y);
  y += 18;

  const tLeft = leftX;
  const c1 = tLeft;
  const c2 = tLeft + 200;
  const c3 = tLeft + 290;
  const c4 = tLeft + 380;
  const rowH = 22;
  const headerH = 24;

  doc.rect(tLeft, y, pageW, headerH).fill("#111111");
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
  doc.text("Description", c1 + 8, y + 7, { width: 180 });
  doc.text("Duration", c2, y + 7, { width: 70 });
  doc.text("Price", c3, y + 7, { width: 70 });
  doc.text("Amount", c4, y + 7, { width: 100 });
  y += headerH;

  doc.font("Helvetica").fontSize(9).fillColor("#333333");
  rows.forEach((r, i) => {
    if (i % 2 === 1) {
      doc.save();
      doc.fillColor("#fafafa").rect(tLeft, y, pageW, rowH).fill();
      doc.restore();
    }
    doc.strokeColor("#eeeeee").rect(tLeft, y, pageW, rowH).stroke();
    doc.fillColor("#333333");
    doc.text(r.desc, c1 + 8, y + 6, { width: 180 });
    doc.text(r.dur, c2, y + 6, { width: 70 });
    doc.text(money(r.unit), c3, y + 6, { width: 70 });
    doc.text(money(r.amt), c4, y + 6, { width: 100 });
    y += rowH;
  });

  y += 16;

  const paid = booking.finalAmount > 0 || booking.status === "Completed";

  // —— SUMMARY ——
  const boxW = 220;
  const boxX = leftX + pageW - boxW;
  const summaryTop = y;
  const boxH = paid ? 112 : 92;
  doc.save();
  doc.fillColor("#fafafa").roundedRect(boxX, summaryTop, boxW, boxH, 10).fill();
  doc.strokeColor("#eeeeee").roundedRect(boxX, summaryTop, boxW, boxH, 10).stroke();
  doc.restore();

  let lineY = summaryTop + 10;
  doc.font("Helvetica").fontSize(9).fillColor("#333333");
  doc.text("Subtotal", boxX + 12, lineY);
  doc.text(money(subtotal), boxX + 120, lineY, { width: 88, align: "right" });
  lineY += 14;
  doc.text("Discount", boxX + 12, lineY);
  doc.text(discountAmt > 0 ? `− ${money(discountAmt)}` : money(0), boxX + 120, lineY, { width: 88, align: "right" });
  lineY += 18;

  doc.save();
  doc.fillColor("#2e7d32").roundedRect(boxX + 8, lineY, boxW - 16, 24, 6).fill();
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#ffffff");
  doc.text("Total", boxX + 16, lineY + 6, { width: 72 });
  doc.text(money(finalAmt), boxX + 120, lineY + 6, { width: 88, align: "right" });
  lineY += 30;

  if (paid) {
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#2e7d32");
    doc.rect(boxX + 8, lineY, boxW - 16, 20).stroke("#2e7d32");
    doc.text("PAID", boxX + 8, lineY + 5, { width: boxW - 16, align: "center" });
  }

  y = summaryTop + boxH + 16;

  if (y > 620) {
    doc.addPage();
    y = 36;
  }

  // —— FOOTER: NOTES + BANK ——
  const notesText = [jobCard?.notes, brand.footerNote].filter(Boolean).join("\n\n") || "—";
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111111").text("Notes", leftX, y);
  doc.font("Helvetica").fontSize(9).fillColor(muted).text(notesText, leftX, y + 14, { width: pageW / 2 - 10 });

  doc.font("Helvetica-Bold").fontSize(10).text("Bank details", leftX + pageW / 2 + 10, y);
  doc.font("Helvetica").fontSize(9);
  doc.text(`${brand.bankName}`, leftX + pageW / 2 + 10, y + 14, { width: pageW / 2 - 10 });
  doc.text(`Acc: ${brand.bankAccount}`, leftX + pageW / 2 + 10, y + 28, { width: pageW / 2 - 10 });
  doc.text(`IFSC: ${brand.bankIfsc}`, leftX + pageW / 2 + 10, y + 42, { width: pageW / 2 - 10 });

  y += 72;

  if (y > 640) {
    doc.addPage();
    y = 36;
  }

  doc.font("Helvetica").fontSize(8).fillColor("#999999");
  const sigTop = y + 8;
  doc.text("Authorized signature", leftX + pageW - 200, sigTop + 36, { width: 200, align: "right" });
  doc.moveTo(leftX + pageW - 200, sigTop + 28).lineTo(leftX + pageW, sigTop + 28).stroke("#000000");

  doc.fontSize(7).fillColor("#aaaaaa").text(
    `Generated ${new Date().toISOString().slice(0, 19).replace("T", " ")} UTC · Booking ${String(booking._id)}`,
    leftX,
    sigTop + 52,
    { width: pageW, align: "center" }
  );

  return endDoc();
}

module.exports = { buildInvoicePdfBuffer };
