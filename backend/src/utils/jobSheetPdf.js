const PDFDocument = require("pdfkit");
const Booking = require("../models/Booking");
const JobCard = require("../models/JobCard");
const Inspection = require("../models/Inspection");

/** Branding — override via backend .env (see .env.example). */
function getBrand() {
  return {
    garageName: process.env.JOB_SHEET_GARAGE_NAME || "Blackline Auto Studio",
    tagline: process.env.JOB_SHEET_TAGLINE || "Premium car detailing, restoration & performance care",
    location: process.env.JOB_SHEET_LOCATION || "—",
    phone: process.env.JOB_SHEET_PHONE || "—",
    email: process.env.JOB_SHEET_EMAIL || "—",
    technician: process.env.JOB_SHEET_TECHNICIAN_NAME || "",
  };
}

async function fetchImageBuffer(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

function statusLabel(status) {
  const map = { Pending: "Pending", "In Progress": "In Progress", Completed: "Completed" };
  return map[status] || status;
}

function statusIcon(status) {
  if (status === "Completed") return "Completed";
  if (status === "In Progress") return "In Progress";
  return "Pending";
}

/** Split description into bullet-ish lines (newlines or sentences). */
function serviceBulletLines(description) {
  if (!description) return [];
  const raw = String(description).trim();
  const byNl = raw.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  if (byNl.length > 1) return byNl.slice(0, 8);
  const bySentence = raw.split(/\.\s+|\!\s+|\?\s+/).map((s) => s.trim()).filter(Boolean);
  return bySentence.slice(0, 8);
}

function paymentStatusText(finalRecorded, calculatedTotal) {
  if (finalRecorded != null && finalRecorded > 0) return "Recorded / Paid";
  if (calculatedTotal > 0) return "Pending settlement";
  return "—";
}

/**
 * Dynamic job-card style PDF: booking, customer, vehicle, service, payment, work, before/after photos, signatures.
 */
async function buildJobSheetPdfBuffer(bookingId) {
  const booking = await Booking.findById(bookingId).populate("serviceId");
  if (!booking) {
    const err = new Error("Booking not found");
    err.statusCode = 404;
    throw err;
  }

  const [jobCard, inspection] = await Promise.all([
    JobCard.findOne({ bookingId: booking._id }),
    Inspection.findOne({ bookingId: booking._id }),
  ]);

  const service = booking.serviceId;
  const basePrice = service?.basePrice ?? 0;
  const extra = jobCard?.extraCharges ?? 0;
  const calculatedTotal = basePrice + extra;
  const finalRecorded = booking.finalAmount > 0 ? booking.finalAmount : null;
  const brand = getBrand();
  const jobRef = `JS-${String(booking._id).slice(-6).toUpperCase()}`;
  const bullets = serviceBulletLines(service?.description);

  const doc = new PDFDocument({ size: "A4", margin: 36, info: { Title: `Job Card ${jobRef}`, Author: brand.garageName } });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));

  const endDoc = () =>
    new Promise((resolve, reject) => {
      doc.on("error", reject);
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.end();
    });

  const pageWidth = 595.28 - 72;
  const leftX = 36;
  const colW = (pageWidth - 12) / 2;
  const rightX = leftX + colW + 12;
  const accent = "#c62828";
  const muted = "#555555";
  const greenBg = "#e8f5e9";
  const cardBorder = "#eeeeee";

  let y = 36;

  // —— HEADER ——
  doc.font("Helvetica-Bold").fontSize(20).fillColor(accent).text(brand.garageName, leftX, y, { width: 380 });
  doc.font("Helvetica").fontSize(8).fillColor(muted).text(brand.tagline, leftX, y + 22, { width: 380 });
  doc.roundedRect(440, y, 120, 28, 4).fill("#111111");
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#ffffff").text("JOB CARD", 440, y + 8, { width: 120, align: "center" });
  y += 40;

  doc.moveTo(leftX, y).lineTo(leftX + pageWidth, y).strokeColor("#eeeeee").lineWidth(1).stroke();
  y += 10;

  doc.font("Helvetica").fontSize(9).fillColor(muted);
  doc.text(`${brand.location}   |   ${brand.phone}   |   ${brand.email}`, leftX, y, { width: pageWidth });
  y = doc.y + 14;

  // —— BOOKING STRIP ——
  doc.roundedRect(leftX, y, pageWidth, 72, 6).stroke(cardBorder);
  doc.font("Helvetica").fontSize(9).fillColor("#333333");
  let rowY = y + 10;
  doc.text(`Booking ID: ${jobRef}    Date: ${booking.date}    Time: ${booking.time}`, leftX + 12, rowY, {
    width: pageWidth - 24,
  });
  doc.text(`Status: ${statusIcon(booking.status)} — ${statusLabel(booking.status)}`, leftX + 12, rowY + 14);
  y += 84;

  // —— CUSTOMER + VEHICLE (two columns) ——
  const boxH = 126;
  doc.roundedRect(leftX, y, colW, boxH, 6).stroke(cardBorder);
  doc.roundedRect(rightX, y, colW, boxH, 6).stroke(cardBorder);

  doc.rect(leftX, y, 4, 24).fill(accent);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111111").text("Customer Details", leftX + 12, y + 6);
  doc.font("Helvetica").fontSize(9).fillColor("#333333");
  doc.text(`Name: ${booking.customerName}`, leftX + 12, y + 28, { width: colW - 20 });
  doc.text(`Phone: ${booking.phone}`, leftX + 12, y + 42, { width: colW - 20 });
  doc.text(`Email: ${booking.email}`, leftX + 12, y + 56, { width: colW - 20 });

  doc.rect(rightX, y, 4, 24).fill(accent);
  doc.font("Helvetica-Bold").fontSize(10).text("Vehicle Details", rightX + 12, y + 6);
  doc.font("Helvetica").fontSize(9);
  const mk = booking.carMake || "—";
  const chassis = booking.chassisNumber || booking.registrationNumber || "—";
  const yr = booking.vehicleYear != null && Number.isFinite(Number(booking.vehicleYear)) ? String(booking.vehicleYear) : "—";
  doc.text(`Make: ${mk}`, rightX + 12, y + 28, { width: colW - 20 });
  doc.text(`Model: ${booking.carModel}`, rightX + 12, y + 42, { width: colW - 20 });
  doc.text(`Year: ${yr}`, rightX + 12, y + 56, { width: colW - 20 });
  doc.text(`Body type: ${booking.vehicleType}`, rightX + 12, y + 70, { width: colW - 20 });
  doc.text(`Chassis (RC): ${chassis}`, rightX + 12, y + 84, { width: colW - 20 });
  doc.fillColor("#333333");

  y += boxH + 12;

  // —— SERVICE + PAYMENT ——
  const boxH2 = Math.max(120, 28 + bullets.length * 12 + 40);
  doc.roundedRect(leftX, y, colW, boxH2, 6).stroke(cardBorder);
  doc.roundedRect(rightX, y, colW, boxH2, 6).stroke(cardBorder);

  doc.rect(leftX, y, 4, 24).fill(accent);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111111").text("Service Details", leftX + 12, y + 6);
  doc.font("Helvetica-Bold").fontSize(10).text(service?.name || "—", leftX + 12, y + 28, { width: colW - 20 });
  doc.font("Helvetica").fontSize(9).text(`Duration: ${service?.duration ?? "—"} mins`, leftX + 12, y + 44, { width: colW - 20 });
  let sy = y + 58;
  bullets.forEach((line) => {
    doc.text(`• ${line}`, leftX + 16, sy, { width: colW - 24 });
    sy += 12;
  });
  if (bullets.length === 0 && service?.description) {
    doc.text(service.description.slice(0, 400) + (service.description.length > 400 ? "…" : ""), leftX + 12, sy, { width: colW - 20 });
  }

  doc.rect(rightX, y, 4, 24).fill(accent);
  doc.font("Helvetica-Bold").fontSize(10).text("Payment", rightX + 12, y + 6);
  doc.font("Helvetica").fontSize(9).fillColor("#333333");
  let py = y + 28;
  doc.text(`Service price: ${money(basePrice)}`, rightX + 12, py, { width: colW - 20 });
  py += 14;
  doc.text(`Extra / add-ons: ${money(extra)}`, rightX + 12, py, { width: colW - 20 });
  py += 14;
  doc.save();
  doc.fillColor(greenBg).roundedRect(rightX + 12, py, colW - 24, 22, 4).fill();
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#2e7d32");
  const totalDisplay = finalRecorded != null && finalRecorded > 0 ? finalRecorded : calculatedTotal;
  doc.text(`Total: ${money(totalDisplay)}`, rightX + 16, py + 5, { width: colW - 28 });
  doc.fillColor("#333333").font("Helvetica").fontSize(9);
  py += 30;
  doc.text(`Mode: ${process.env.JOB_SHEET_PAYMENT_MODE || "—"}`, rightX + 12, py, { width: colW - 20 });
  py += 12;
  doc.text(`Status: ${paymentStatusText(finalRecorded, calculatedTotal)}`, rightX + 12, py, { width: colW - 20 });

  y += boxH2 + 12;

  if (y > 680) {
    doc.addPage();
    y = 36;
  }

  // —— WORK PERFORMED ——
  const doneList = (jobCard?.servicesDone || []).filter(Boolean);
  const partsList = (jobCard?.partsUsed || []).filter(Boolean);
  const notesLine = jobCard?.notes || "—";
  const workLines =
    28 +
    doneList.length * 12 +
    partsList.length * 12 +
    (brand.technician ? 12 : 0) +
    12 +
    Math.ceil(notesLine.length / 90) * 12 +
    20;
  const workBoxH = Math.max(72, workLines);
  doc.roundedRect(leftX, y, pageWidth, workBoxH, 6).stroke(cardBorder);
  doc.rect(leftX, y, 4, 24).fill(accent);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111111").text("Work Performed", leftX + 12, y + 6);
  doc.font("Helvetica").fontSize(9).fillColor("#333333");
  let wy = y + 28;
  doneList.forEach((s) => {
    doc.text(`✓ ${s}`, leftX + 12, wy, { width: pageWidth - 24 });
    wy += 12;
  });
  partsList.forEach((p) => {
    doc.text(`Parts: ${p}`, leftX + 12, wy, { width: pageWidth - 24 });
    wy += 12;
  });
  if (brand.technician) {
    doc.text(`Technician: ${brand.technician}`, leftX + 12, wy, { width: pageWidth - 24 });
    wy += 12;
  }
  doc.text(`Notes: ${notesLine}`, leftX + 12, wy, { width: pageWidth - 24 });
  y += workBoxH + 12;

  const beforeUrls = (inspection?.beforeImages || []).map((i) => i.url);
  const afterUrls = (inspection?.afterImages || []).map((i) => i.url);

  async function sectionPhotos(title, urls) {
    if (y > 620) {
      doc.addPage();
      y = 36;
    }
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#111111");
    doc.rect(leftX, y, 4, 18).fill(accent);
    doc.text(title, leftX + 10, y + 2, { width: pageWidth });
    y += 22;
    doc.font("Helvetica").fontSize(8).fillColor(muted);
    if (urls.length === 0) {
      doc.text("No photos uploaded.", leftX, y);
      y = doc.y + 10;
      return;
    }
    const thumbW = (pageWidth - 12) / 2;
    const thumbH = 100;
    for (let i = 0; i < urls.length; i += 2) {
      if (y > 650) {
        doc.addPage();
        y = 36;
      }
      const pair = [urls[i], urls[i + 1]].filter(Boolean);
      let xPos = leftX;
      for (const url of pair) {
        const buf = await fetchImageBuffer(url);
        if (buf) {
          try {
            doc.image(buf, xPos, y, { width: thumbW - 6, height: thumbH });
          } catch {
            doc.text("(image)", xPos, y);
          }
        } else {
          doc.text("(unavailable)", xPos, y);
        }
        xPos += thumbW + 6;
      }
      y += thumbH + 8;
    }
  }

  await sectionPhotos("Before Service", beforeUrls);
  await sectionPhotos("After Service", afterUrls);

  y += 16;
  if (y > 680) {
    doc.addPage();
    y = 36;
  }

  // —— SIGNATURES ——
  doc.font("Helvetica").fontSize(9).fillColor("#333333");
  const sigW = pageWidth / 3 - 8;
  const sigY = y;
  const labels = ["Customer Signature", "Service Advisor", "Authorized Sign"];
  for (let i = 0; i < 3; i++) {
    const sx = leftX + i * (sigW + 12);
    doc.moveTo(sx, sigY + 28).lineTo(sx + sigW, sigY + 28).strokeColor("#000000").lineWidth(0.5).stroke();
    doc.text(labels[i], sx, sigY + 32, { width: sigW, align: "center" });
  }

  const footerY = Math.min(sigY + 52, 800);
  doc.font("Helvetica").fontSize(7).fillColor(muted).text(
    `Generated ${new Date().toISOString().slice(0, 19).replace("T", " ")} UTC · Booking ${String(booking._id)}`,
    leftX,
    footerY,
    { align: "center", width: pageWidth }
  );

  return endDoc();
}

module.exports = { buildJobSheetPdfBuffer };
