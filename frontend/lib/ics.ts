/** Build a minimal iCalendar (.ics) payload for a booking slot (local date/time → UTC in file). */

function escapeText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function parseLocalDateTime(dateStr: string, timeStr: string): Date {
  const [y, mo, d] = dateStr.split("-").map((x) => parseInt(x, 10));
  const [hh, mm] = timeStr.split(":").map((x) => parseInt(x, 10));
  return new Date(y, (mo || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
}

function utcStamp(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildBookingIcs(opts: {
  uid: string;
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  durationMinutes: number;
}) {
  const start = parseLocalDateTime(opts.date, opts.time);
  const end = new Date(start.getTime() + Math.max(15, opts.durationMinutes) * 60_000);
  const dtStart = utcStamp(start);
  const dtEnd = utcStamp(end);
  const uid = `${opts.uid}@car-service-booking`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Car Service//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeText(opts.title)}`,
    `DESCRIPTION:${escapeText(opts.description)}`,
    `LOCATION:${escapeText(opts.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
