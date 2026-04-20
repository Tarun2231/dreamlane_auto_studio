const Service = require("../models/Service");

const IMMOBILIZER_SERVICE = {
  name: "Immobilizer & key replacement",
  description:
    "Diagnostics and replacement for electronic keys, remotes, and immobilizer-related issues. Pricing depends on vehicle and key type — confirmed after inspection. Bring vehicle documents and ID.",
  image:
    "https://images.unsplash.com/photo-1625047509168-a7026f36de04?q=80&w=1200&auto=format&fit=crop",
  basePrice: 1500,
  duration: 90,
  followUpMonths: 0,
};

/** Served by the Next.js app from `frontend/public/images/services/manual-carbon-cleaning.png`. */
const MANUAL_CARBON_CLEANING_IMAGE = "/images/services/manual-carbon-cleaning.png";

const MANUAL_CARBON_CLEANING_SERVICE = {
  name: "Manual Carbon Cleaning",
  description:
    "Hands-on decarbonising across the intake path: throttle body, intake manifold, intercooler, EGR valve, intake valves, and air duct & sensors. " +
    "Aims to improve performance, restore fuel efficiency, reduce emissions, and support smooth engine operation. Final scope and price depend on vehicle condition.",
  image: MANUAL_CARBON_CLEANING_IMAGE,
  basePrice: 4499,
  duration: 120,
  followUpMonths: 12,
};

/**
 * Ensures default workshop services exist (safe to call on every boot).
 */
async function ensureDefaultServices() {
  try {
    const existingImmob = await Service.findOne({ name: IMMOBILIZER_SERVICE.name });
    if (!existingImmob) {
      await Service.create(IMMOBILIZER_SERVICE);
      console.log("[bootstrap] Added default service: Immobilizer & key replacement");
    }

    const carbon = await Service.findOne({ name: MANUAL_CARBON_CLEANING_SERVICE.name });
    if (!carbon) {
      await Service.create(MANUAL_CARBON_CLEANING_SERVICE);
      console.log("[bootstrap] Added default service: Manual Carbon Cleaning");
    }
  } catch (e) {
    console.error("[bootstrap] ensureDefaultServices:", e?.message || e);
  }
}

module.exports = ensureDefaultServices;
