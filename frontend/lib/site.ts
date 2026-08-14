/** Public marketing copy — override via env if needed */
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "Blacklane Auto Studio";
export const SITE_SHORT = process.env.NEXT_PUBLIC_SITE_SHORT ?? "DriveCare";
export const SITE_TAGLINE =
  process.env.NEXT_PUBLIC_SITE_TAGLINE ??
  "Premium car detailing, restoration, and performance care.";

export const SITE_PHONE = process.env.NEXT_PUBLIC_SITE_PHONE ?? "+91 90000 00000";
export const SITE_EMAIL = process.env.NEXT_PUBLIC_SITE_EMAIL ?? "support@blacklaneauto.com";

/** Shown when no env override — also the default in the header location picker */
export const SITE_LOCATION_DEFAULT = "Hyderabad";

/** Cities visitors can pick (header); first entry should match the default */
export const SITE_LOCATION_OPTIONS = [
  "Hyderabad",
  "Bengaluru",
  "Mumbai",
  "Delhi NCR",
  "Chennai",
  "Pune",
  "Los Angeles",
] as const;

export type SiteLocationOption = (typeof SITE_LOCATION_OPTIONS)[number];

export function isSiteLocationOption(value: string): value is SiteLocationOption {
  return (SITE_LOCATION_OPTIONS as readonly string[]).includes(value);
}

/** Initial location: `NEXT_PUBLIC_SITE_LOCATION` if it matches the list, else Hyderabad */
export function getInitialSiteLocation(): string {
  const env = process.env.NEXT_PUBLIC_SITE_LOCATION?.trim();
  if (env && isSiteLocationOption(env)) return env;
  return SITE_LOCATION_DEFAULT;
}

/** Static label for SSR / non-interactive use — matches `getInitialSiteLocation()` */
export const SITE_LOCATION = getInitialSiteLocation();

/** Digits only, e.g. 14155552671 — used for https://wa.me/… Leave unset to hide WhatsApp links. */
export const SITE_WHATSAPP =
  process.env.NEXT_PUBLIC_SITE_WHATSAPP?.replace(/\D/g, "") ?? "";

export const SITE_HOURS = [
  { label: "Mon – Sat", value: "9:00 AM – 8:00 PM" },
  { label: "Sunday", value: "By appointment" },
] as const;

/** Homepage stat strip — edit to match your workshop story */
export const SITE_HOME_STATS = [
  { value: "15+", label: "Years in business" },
  { value: "5k+", label: "Vehicles cared for" },
  { value: "Online", label: "Booking & tracking" },
  { value: "Clear", label: "Quotes & invoices" },
] as const;

/** Hero accent chips — keep short; set to [] to hide */
export const SITE_HOME_HERO_BADGES = [
  "Trained technicians",
  "Written quotes",
  "Digital job history",
] as const;

/** Fallback quotes when no admin-approved reviews exist yet (see GET /api/reviews) */
export const SITE_HOME_TESTIMONIALS = [
  {
    quote:
      "Booking took two minutes and the car came back looking better than showroom. Communication was clear the whole way.",
    author: "Priya K.",
    context: "Full detail & ceramic prep",
  },
  {
    quote:
      "They explained what was needed vs optional, and the invoice matched what we discussed. That honesty matters.",
    author: "James R.",
    context: "SUV service package",
  },
  {
    quote:
      "I use Track booking for updates and grabbed my invoice PDF without chasing anyone. Exactly what I wanted.",
    author: "Anita S.",
    context: "Performance check & fluids",
  },
] as const;

/** Short assurance row before the final CTA */
export const SITE_HOME_PROMISES = [
  {
    title: "Upfront estimates",
    body: "Know what you’re paying for before work begins.",
  },
  {
    title: "Quality-first parts",
    body: "Fluids and materials matched to your vehicle.",
  },
  {
    title: "Clear records",
    body: "Confirmations, status, and invoices in one flow.",
  },
  {
    title: "Human support",
    body: "Reach us by phone, email, or WhatsApp when you need help.",
  },
] as const;
