/** Public marketing copy — override via env if needed */
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "Blackline Auto Studio";
export const SITE_SHORT = process.env.NEXT_PUBLIC_SITE_SHORT ?? "DriveCare";
export const SITE_TAGLINE =
  process.env.NEXT_PUBLIC_SITE_TAGLINE ??
  "Premium car detailing, restoration, and performance care.";

export const SITE_PHONE = process.env.NEXT_PUBLIC_SITE_PHONE ?? "+91 90000 00000";
export const SITE_EMAIL = process.env.NEXT_PUBLIC_SITE_EMAIL ?? "support@blacklineauto.com";
export const SITE_LOCATION = process.env.NEXT_PUBLIC_SITE_LOCATION ?? "Los Angeles";

/** Digits only, e.g. 14155552671 — used for https://wa.me/… Leave unset to hide WhatsApp links. */
export const SITE_WHATSAPP =
  process.env.NEXT_PUBLIC_SITE_WHATSAPP?.replace(/\D/g, "") ?? "";

export const SITE_HOURS = [
  { label: "Mon – Sat", value: "9:00 AM – 8:00 PM" },
  { label: "Sunday", value: "By appointment" },
] as const;
