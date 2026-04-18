/** Used when a service has no image URL yet (avoids broken Next/Image). */
export const FALLBACK_SERVICE_IMAGE =
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1200&auto=format&fit=crop";

export function serviceImageUrl(url?: string | null): string {
  if (!url || typeof url !== "string" || url.trim() === "") return FALLBACK_SERVICE_IMAGE;
  return url.trim();
}
