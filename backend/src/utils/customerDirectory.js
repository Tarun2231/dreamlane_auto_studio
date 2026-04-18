const Booking = require("../models/Booking");

function normalizeEmail(e) {
  return String(e || "")
    .trim()
    .toLowerCase();
}

/** YYYY-MM-DD in local calendar for the given Date. */
function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addCalendarMonthsYmd(isoDateStr, months) {
  const parts = String(isoDateStr).split("-").map(Number);
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, mo, d] = parts;
  const dt = new Date(y, mo - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  dt.setMonth(dt.getMonth() + (Number.isFinite(months) ? months : 0));
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Loads completed bookings, groups by email, applies filters, computes next-service reminder from Service.followUpMonths.
 */
async function buildCustomerDirectory({ dateFrom, dateTo, q, phone } = {}) {
  const raw = await Booking.find({ status: "Completed" })
    .populate("serviceId")
    .sort({ date: -1, createdAt: -1 })
    .lean();

  const map = new Map();

  for (const b of raw) {
    const key = normalizeEmail(b.email);
    if (!key) continue;

    const svc = b.serviceId;
    const serviceLite = svc
      ? {
          _id: String(svc._id),
          name: svc.name,
          followUpMonths:
            svc.followUpMonths != null && svc.followUpMonths !== "" ? Number(svc.followUpMonths) : null,
        }
      : null;

    const row = {
      _id: String(b._id),
      date: b.date,
      time: b.time,
      status: b.status,
      vehicleType: b.vehicleType,
      carModel: b.carModel,
      finalAmount: b.finalAmount,
      service: serviceLite,
    };

    if (!map.has(key)) {
      map.set(key, {
        email: b.email,
        emailNorm: key,
        customerName: b.customerName,
        phone: b.phone,
        bookings: [],
        lastServiceDate: b.date,
      });
    }

    const entry = map.get(key);
    entry.bookings.push(row);
    if (b.date > entry.lastServiceDate) {
      entry.lastServiceDate = b.date;
      entry.customerName = b.customerName;
      entry.phone = b.phone;
    }
  }

  for (const entry of map.values()) {
    entry.bookings.sort((a, b) => b.date.localeCompare(a.date) || String(b.time).localeCompare(String(a.time)));

    const withFollowUp = entry.bookings.filter(
      (bk) => bk.service && Number(bk.service.followUpMonths) > 0
    );
    withFollowUp.sort((a, b) => a.date.localeCompare(b.date));
    const anchor = withFollowUp.length ? withFollowUp[withFollowUp.length - 1] : null;

    if (anchor && anchor.service) {
      const months = Number(anchor.service.followUpMonths);
      entry.nextServiceDueDate = addCalendarMonthsYmd(anchor.date, months);
      entry.reminderAnchor = {
        bookingId: anchor._id,
        servicedOn: anchor.date,
        serviceName: anchor.service.name,
        followUpMonths: months,
      };
    } else {
      entry.nextServiceDueDate = null;
      entry.reminderAnchor = null;
    }
  }

  let list = Array.from(map.values());

  const qq = q ? String(q).trim().toLowerCase() : "";
  if (qq) {
    list = list.filter(
      (c) =>
        c.customerName.toLowerCase().includes(qq) ||
        c.email.toLowerCase().includes(qq) ||
        c.emailNorm.includes(qq)
    );
  }

  const phoneFilter = phone ? String(phone).trim().replace(/\D/g, "") : "";
  if (phoneFilter) {
    list = list.filter((c) => c.phone.replace(/\D/g, "").includes(phoneFilter));
  }

  if (dateFrom) {
    list = list.filter((c) => c.lastServiceDate >= dateFrom);
  }
  if (dateTo) {
    list = list.filter((c) => c.lastServiceDate <= dateTo);
  }

  const today = ymdLocal(new Date());
  list.sort((a, b) => (a.lastServiceDate < b.lastServiceDate ? 1 : -1));

  for (const c of list) {
    c.reminderDueToday = !!(c.nextServiceDueDate && c.nextServiceDueDate === today);
    c.reminderOverdue =
      !!(c.nextServiceDueDate && c.nextServiceDueDate < today);
  }

  return { customers: list, today };
}

module.exports = {
  normalizeEmail,
  ymdLocal,
  addCalendarMonthsYmd,
  buildCustomerDirectory,
};
