/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://zjhlvmssrpcawajhfpfg.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "sb_publishable_VU8pJ3utws5oeU8meFcAHg_bstYju59";

let supabase = null;
try {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
} catch (e) {
  console.warn("[supabaseDb] Supabase client init warning:", e?.message);
}

// Local store file path
function getStoreFilePath() {
  if (process.env.VERCEL) {
    return path.join("/tmp", "dreamlane_db.json");
  }
  return path.join(process.cwd(), "data", "db.json");
}

const DEFAULT_SERVICES = [
  {
    _id: "svc-foam-wash-01",
    id: "svc-foam-wash-01",
    name: "Signature Foam Wash & Interior Detail",
    description: "Deep exterior snow foam bath, wheel & barrel decontamination, plush drying, vacuum, and interior dashboard dressing.",
    image: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1200&q=80",
    basePrice: 1499,
    price: 1499,
    duration: 60,
    durationText: "60 mins",
    followUpMonths: 3,
    isActive: true,
  },
  {
    _id: "svc-paint-correction-02",
    id: "svc-paint-correction-02",
    name: "Multi-Stage Paint Correction",
    description: "High-grade rotary and dual action polishing removing 85-95% of swirl marks, light scratches, and oxidation.",
    image: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1200&q=80",
    basePrice: 6999,
    price: 6999,
    duration: 180,
    durationText: "180 mins",
    followUpMonths: 12,
    isActive: true,
  },
  {
    _id: "svc-ceramic-coating-03",
    id: "svc-ceramic-coating-03",
    name: "Graphene 9H Ceramic Coating",
    description: "Ultra-durable 9H nano ceramic + graphene coating providing up to 3 years of hydrophobic protection and extreme gloss.",
    image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1200&q=80",
    basePrice: 14999,
    price: 14999,
    duration: 360,
    durationText: "360 mins",
    followUpMonths: 12,
    isActive: true,
  },
  {
    _id: "svc-interior-spa-04",
    id: "svc-interior-spa-04",
    name: "Interior Deep Spa & Leather Sanitization",
    description: "Hot water extraction for upholstery and carpets, leather deep cleaning & conditioning, steam disinfection, and anti-bacterial AC fogging.",
    image: "https://images.unsplash.com/photo-1507136566006-cfc505b114fc?auto=format&fit=crop&w=1200&q=80",
    basePrice: 3499,
    price: 3499,
    duration: 120,
    durationText: "120 mins",
    followUpMonths: 6,
    isActive: true,
  },
];

const DEFAULT_SHOP_PRODUCTS = [
  {
    _id: "prod-hydro-graphene-01",
    id: "prod-hydro-graphene-01",
    name: "Dreamlane HydroGraphene Detail Spray (500ml)",
    slug: "hydro-graphene-detail-spray-500ml",
    description: "Advanced spray sealant with real graphene oxide. Delivers slickness, high contact angle water beading, and UV protection.",
    productGroup: "accessory",
    category: "Protection",
    image: "https://images.unsplash.com/photo-1585832770485-e68a5dbfad52?auto=format&fit=crop&w=800&q=80",
    basePrice: 899,
    discountPercent: 10,
    effectivePrice: 809,
    stock: 45,
    isActive: true,
    sortOrder: 10,
  },
  {
    _id: "prod-snow-foam-02",
    id: "prod-snow-foam-02",
    name: "pH Neutral Ultra Snow Foam Shampoo (1L)",
    slug: "ph-neutral-ultra-snow-foam-1l",
    description: "High-lubricity formula engineered for ceramic coated and PPF-wrapped cars. Removes road grime without stripping existing wax or sealants.",
    productGroup: "accessory",
    category: "Car Wash",
    image: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80",
    basePrice: 649,
    discountPercent: 0,
    effectivePrice: 649,
    stock: 80,
    isActive: true,
    sortOrder: 9,
  },
  {
    _id: "prod-microfiber-03",
    id: "prod-microfiber-03",
    name: "Dual-Plush Korean Microfiber Towel Set (Pack of 3)",
    slug: "dual-plush-microfiber-towel-pack-3",
    description: "1000 GSM edgeless microfiber towels crafted for scratch-free buffing, quick detailers, and drying delicate clear coats.",
    productGroup: "accessory",
    category: "Accessories",
    image: "https://images.unsplash.com/photo-1527264935190-14015d729abe?auto=format&fit=crop&w=800&q=80",
    basePrice: 549,
    discountPercent: 15,
    effectivePrice: 467,
    stock: 120,
    isActive: true,
    sortOrder: 8,
  },
  {
    _id: "prod-pressure-washer-04",
    id: "prod-pressure-washer-04",
    name: "Commercial Ceramic Wash Bay Pressure Washer 2200W",
    slug: "commercial-ceramic-wash-bay-pressure-washer",
    description: "Professional-grade auto studio induction pressure pump with quick-connect brass fittings and snow foam cannon.",
    productGroup: "machine",
    category: "Equipment",
    image: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80",
    basePrice: 24999,
    discountPercent: 5,
    effectivePrice: 23749,
    stock: 6,
    isActive: true,
    sortOrder: 7,
  },
];

function generateDailySlots(daysAhead = 30) {
  const times = ["09:00", "11:30", "14:00", "16:30", "18:30"];
  const slots = [];
  const now = new Date();
  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const ymd = d.toISOString().slice(0, 10);
    for (const time of times) {
      slots.push({
        _id: `slot-${ymd}-${time.replace(":", "")}`,
        id: `slot-${ymd}-${time.replace(":", "")}`,
        date: ymd,
        time,
        bayName: "Bay 1",
        isAvailable: true,
      });
    }
  }
  return slots;
}

let inMemoryStore = {
  services: [...DEFAULT_SERVICES],
  shopProducts: [...DEFAULT_SHOP_PRODUCTS],
  slots: generateDailySlots(30),
  bookings: [],
  quotes: [],
  shopOrders: [],
  reviews: [],
  employees: [
    { _id: "emp-1", id: "emp-1", name: "Rahul Sharma", role: "Master Detailer", email: "rahul@carcare.com", phone: "+91 98765 43210", isActive: true },
    { _id: "emp-2", id: "emp-2", name: "Amit Verma", role: "Coating Specialist", email: "amit@carcare.com", phone: "+91 98765 43211", isActive: true },
  ],
};

function readLocalStore() {
  try {
    const filePath = getStoreFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object") {
        inMemoryStore = { ...inMemoryStore, ...parsed };
      }
    }
  } catch (err) {
    // Non-fatal, use in-memory
  }
  return inMemoryStore;
}

function writeLocalStore() {
  try {
    const filePath = getStoreFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(inMemoryStore, null, 2), "utf8");
  } catch (err) {
    // Non-fatal
  }
}

// Initial read
readLocalStore();

/**
 * =========================================================================
 * SERVICES
 * =========================================================================
 */
const isUUID = (str) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || ""));

function normalizeService(s) {
  if (!s) return null;
  const id = s.id || s._id || "";
  return {
    _id: id,
    id: id,
    name: String(s.name || "").trim(),
    description: String(s.description || "").trim(),
    image: String(s.image || "").trim() || "/images/services/placeholder-service.png",
    basePrice: Number(s.base_price != null ? s.base_price : s.basePrice || 0),
    price: Number(s.base_price != null ? s.base_price : s.price || s.basePrice || 0),
    duration: Number(s.duration || 60),
    durationText: `${s.duration || 60} mins`,
    followUpMonths: s.follow_up_months != null ? Number(s.follow_up_months) : (s.followUpMonths != null ? Number(s.followUpMonths) : null),
    isActive: s.is_active !== undefined ? Boolean(s.is_active) : (s.isActive !== undefined ? Boolean(s.isActive) : true),
    createdAt: s.created_at || s.createdAt || new Date().toISOString(),
    updatedAt: s.updated_at || s.updatedAt || new Date().toISOString(),
  };
}

async function getServices(includeInactive = false) {
  readLocalStore();
  if (supabase) {
    try {
      let query = supabase.from("services").select("*").order("base_price", { ascending: true });
      if (!includeInactive) {
        query = query.eq("is_active", true);
      }
      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        const supaList = data.map(normalizeService);

        // Synchronize inMemoryStore with latest Supabase active states
        for (const s of supaList) {
          const match = inMemoryStore.services.find((ls) => ls._id === s.id || ls.id === s.id);
          if (match) {
            match.isActive = s.isActive;
            match.name = s.name;
            match.description = s.description;
            match.basePrice = s.basePrice;
            match.duration = s.duration;
            match.image = s.image;
          }
        }

        // Check against ALL Supabase service IDs so offline services are NEVER accidentally resurrected by local fallback
        const allSupaIds = new Set(data.map((s) => s.id));
        const localOnly = inMemoryStore.services
          .filter((s) => (includeInactive ? true : s.isActive !== false) && !allSupaIds.has(s._id) && !allSupaIds.has(s.id))
          .map(normalizeService);

        return [...supaList, ...localOnly];
      }
    } catch (err) {
      console.warn("[supabaseDb] getServices fallback:", err?.message);
    }
  }
  return inMemoryStore.services
    .filter((s) => (includeInactive ? true : s.isActive !== false))
    .map(normalizeService);
}

async function getServiceById(id, includeInactive = true) {
  const all = await getServices(includeInactive);
  const found = all.find((s) => s._id === id || s.id === id);
  if (found) return found;

  if (supabase && isUUID(id)) {
    try {
      const { data, error } = await supabase.from("services").select("*").eq("id", id).maybeSingle();
      if (!error && data) {
        return normalizeService(data);
      }
    } catch (err) {
      console.warn("[supabaseDb] getServiceById Supabase query fallback:", err?.message);
    }
  }
  return null;
}

async function createService(payload) {
  readLocalStore();
  let id = `svc-${Date.now()}`;
  const now = new Date().toISOString();
  const isActive = payload.isActive !== false;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("services")
        .insert([{
          name: String(payload.name || "").trim(),
          description: String(payload.description || "").trim(),
          image: String(payload.image || "").trim() || "/images/services/placeholder-service.png",
          base_price: Number(payload.basePrice || 0),
          duration: Number(payload.duration || 60),
          follow_up_months: payload.followUpMonths ? Number(payload.followUpMonths) : null,
          is_active: isActive,
        }])
        .select()
        .single();

      if (!error && data && data.id) {
        id = data.id;
      } else if (error) {
        console.warn("[supabaseDb] createService Supabase error:", error.message || error);
      }
    } catch (err) {
      console.warn("[supabaseDb] createService Supabase exception:", err?.message || err);
    }
  }

  const newService = {
    _id: id,
    id: id,
    name: String(payload.name || "").trim(),
    description: String(payload.description || "").trim(),
    image: String(payload.image || "").trim() || "/images/services/placeholder-service.png",
    basePrice: Number(payload.basePrice || 0),
    price: Number(payload.basePrice || 0),
    duration: Number(payload.duration || 60),
    durationText: `${payload.duration || 60} mins`,
    followUpMonths: payload.followUpMonths ? Number(payload.followUpMonths) : null,
    isActive: isActive,
    createdAt: now,
    updatedAt: now,
  };

  inMemoryStore.services.push(newService);
  writeLocalStore();

  return newService;
}

async function updateService(id, updates) {
  readLocalStore();
  const service = inMemoryStore.services.find((s) => s._id === id || s.id === id);
  const now = new Date().toISOString();

  if (service) {
    if (updates.name !== undefined) service.name = String(updates.name).trim();
    if (updates.description !== undefined) service.description = String(updates.description).trim();
    if (updates.image !== undefined) service.image = String(updates.image).trim();
    if (updates.basePrice !== undefined) {
      service.basePrice = Number(updates.basePrice);
      service.price = Number(updates.basePrice);
    }
    if (updates.duration !== undefined) {
      service.duration = Number(updates.duration);
      service.durationText = `${updates.duration} mins`;
    }
    if (updates.followUpMonths !== undefined) {
      service.followUpMonths = updates.followUpMonths ? Number(updates.followUpMonths) : null;
    }
    if (updates.isActive !== undefined) service.isActive = Boolean(updates.isActive);
    service.updatedAt = now;
    writeLocalStore();
  }

  if (supabase) {
    try {
      const supaUpdates = {};
      if (updates.name !== undefined) supaUpdates.name = String(updates.name).trim();
      if (updates.description !== undefined) supaUpdates.description = String(updates.description).trim();
      if (updates.image !== undefined) supaUpdates.image = String(updates.image).trim();
      if (updates.basePrice !== undefined) supaUpdates.base_price = Number(updates.basePrice);
      if (updates.duration !== undefined) supaUpdates.duration = Number(updates.duration);
      if (updates.followUpMonths !== undefined) {
        supaUpdates.follow_up_months = updates.followUpMonths ? Number(updates.followUpMonths) : null;
      }
      if (updates.isActive !== undefined) supaUpdates.is_active = Boolean(updates.isActive);
      supaUpdates.updated_at = now;

      if (isUUID(id)) {
        const { error } = await supabase.from("services").update(supaUpdates).eq("id", id);
        if (error) {
          console.warn("[supabaseDb] updateService Supabase error:", error.message || error);
        }
      }
    } catch (err) {
      console.warn("[supabaseDb] updateService Supabase exception:", err?.message || err);
    }
  }

  return service || {
    _id: id,
    id,
    name: updates.name,
    description: updates.description,
    image: updates.image,
    basePrice: Number(updates.basePrice || 0),
    duration: Number(updates.duration || 60),
    followUpMonths: updates.followUpMonths,
    isActive: updates.isActive !== undefined ? Boolean(updates.isActive) : true,
  };
}

async function deleteService(id) {
  readLocalStore();
  inMemoryStore.services = inMemoryStore.services.filter((s) => s._id !== id && s.id !== id);
  writeLocalStore();

  if (supabase) {
    try {
      if (isUUID(id)) {
        const { error } = await supabase.from("services").delete().eq("id", id);
        if (error) {
          console.warn("[supabaseDb] deleteService Supabase error:", error.message || error);
        }
      }
    } catch (err) {
      console.warn("[supabaseDb] deleteService Supabase exception:", err?.message || err);
    }
  }

  return true;
}

/**
 * =========================================================================
 * SLOTS
 * =========================================================================
 */
async function getSlots(dateFilter) {
  let slots = inMemoryStore.slots;
  if (dateFilter) {
    slots = slots.filter((s) => s.date === dateFilter);
  }
  // Ensure we always have available slots for the user
  if (slots.length === 0) {
    const fresh = generateDailySlots(30);
    inMemoryStore.slots = fresh;
    writeLocalStore();
    slots = dateFilter ? fresh.filter((s) => s.date === dateFilter) : fresh;
  }
  return slots;
}

/**
 * =========================================================================
 * BOOKINGS
 * =========================================================================
 */
function normalizeBooking(b) {
  if (!b) return null;
  const id = b.id || b._id || "";
  const sName = b.service_name || b.serviceName || (b.serviceId && b.serviceId.name) || "Detailing Service";
  const sId = b.service_id || (b.serviceId && (b.serviceId._id || b.serviceId.id)) || "";

  return {
    _id: id,
    id: id,
    customerName: String(b.customer_name || b.customerName || "Customer").trim(),
    customer_name: String(b.customer_name || b.customerName || "Customer").trim(),
    email: String(b.email || "").trim().toLowerCase(),
    phone: String(b.phone || "").trim(),
    vehicleType: b.vehicle_type || b.vehicleType || "Sedan",
    vehicle_type: b.vehicle_type || b.vehicleType || "Sedan",
    carMake: String(b.car_make || b.carMake || "").trim(),
    car_make: String(b.car_make || b.carMake || "").trim(),
    carModel: String(b.car_model || b.carModel || "").trim(),
    car_model: String(b.car_model || b.carModel || "").trim(),
    vehicleYear: b.vehicle_year != null ? Number(b.vehicle_year) : (b.vehicleYear != null ? Number(b.vehicleYear) : null),
    vehicle_year: b.vehicle_year != null ? Number(b.vehicle_year) : (b.vehicleYear != null ? Number(b.vehicleYear) : null),
    chassisNumber: String(b.chassis_number || b.chassisNumber || "").trim(),
    chassis_number: String(b.chassis_number || b.chassisNumber || "").trim(),
    registrationNumber: String(b.registration_number || b.registrationNumber || "").trim(),
    registration_number: String(b.registration_number || b.registrationNumber || "").trim(),
    date: String(b.date || "").trim(),
    time: String(b.time || "").trim(),
    slotId: b.slot_id || b.slotId || "",
    status: b.status || "Pending",
    finalAmount: Number(b.final_amount != null ? b.final_amount : (b.finalAmount != null ? b.finalAmount : 0)),
    final_amount: Number(b.final_amount != null ? b.final_amount : (b.finalAmount != null ? b.finalAmount : 0)),
    paymentStatus: b.payment_status || b.paymentStatus || "unpaid",
    payment_status: b.payment_status || b.paymentStatus || "unpaid",
    paymentMethod: b.payment_method || b.paymentMethod || "",
    paymentReference: b.payment_reference || b.paymentReference || "",
    paymentReceivedYmd: b.payment_received_ymd || b.paymentReceivedYmd || "",
    serviceName: sName,
    service_name: sName,
    serviceId: {
      _id: sId,
      id: sId,
      name: sName,
      duration: b.serviceId?.duration || 60,
    },
    service_id: sId,
    createdAt: b.created_at || b.createdAt || new Date().toISOString(),
    created_at: b.created_at || b.createdAt || new Date().toISOString(),
    updatedAt: b.updated_at || b.updatedAt || new Date().toISOString(),
    updated_at: b.updated_at || b.updatedAt || new Date().toISOString(),
  };
}

async function createBooking(payload) {
  readLocalStore();
  const now = new Date().toISOString();
  let id = `DL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  // Find and validate service info
  const sid = payload.serviceId || payload.service_id;
  let serviceObj = sid ? await getServiceById(sid, true) : null;
  if (!serviceObj && sid) {
    serviceObj = inMemoryStore.services.find((s) => s._id === sid || s.id === sid);
  }

  // Database-level check: cannot start booking an offline service
  if (serviceObj && serviceObj.isActive === false) {
    const err = new Error("This service is currently offline and unavailable for booking.");
    err.statusCode = 400;
    throw err;
  }

  if (!serviceObj) {
    serviceObj = {
      _id: sid || "custom-service",
      id: sid || "custom-service",
      name: payload.serviceName || payload.service_name || "Custom Detailing Service",
      description: "Auto detailing service",
      basePrice: Number(payload.finalAmount || payload.final_amount || 0),
      duration: 60,
      isActive: true,
    };
  }

  const sId = isUUID(serviceObj.id || serviceObj._id) ? (serviceObj.id || serviceObj._id) : null;

  // Try Supabase insert
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .insert([
          {
            service_id: sId,
            service_name: serviceObj.name,
            vehicle_type: payload.vehicleType || payload.vehicle_type || "Sedan",
            date: String(payload.date || "").trim(),
            time: String(payload.time || "").trim(),
            status: "Pending",
            customer_name: String(payload.customerName || payload.customer_name || "").trim(),
            phone: String(payload.phone || "").trim(),
            email: String(payload.email || "").trim().toLowerCase(),
            car_make: String(payload.carMake || payload.car_make || "").trim(),
            car_model: String(payload.carModel || payload.car_model || "").trim(),
            vehicle_year: Number(payload.vehicleYear || payload.vehicle_year || new Date().getFullYear()),
            chassis_number: String(payload.chassisNumber || payload.chassis_number || "").trim(),
            registration_number: String(payload.registrationNumber || payload.registration_number || "").trim(),
            final_amount: Number(payload.finalAmount || payload.final_amount || serviceObj.basePrice || 0),
            payment_status: "unpaid",
          },
        ])
        .select()
        .single();

      if (!error && data && data.id) {
        id = data.id; // Use canonical Supabase UUID
      } else if (error) {
        console.warn("[supabaseDb] Supabase booking insert warning:", error.message || error);
      }
    } catch (supaErr) {
      console.warn("[supabaseDb] Supabase booking insert fallback:", supaErr?.message || supaErr);
    }
  }

  const normalized = normalizeBooking({
    ...payload,
    id,
    _id: id,
    service_id: sId,
    serviceId: serviceObj,
    serviceName: serviceObj.name,
    service_name: serviceObj.name,
    status: "Pending",
    payment_status: "unpaid",
    createdAt: now,
    updatedAt: now,
  });

  // Always save to persistent local store with canonical ID
  inMemoryStore.bookings.unshift(normalized);
  if (normalized.slotId) {
    const slot = inMemoryStore.slots.find((s) => s._id === normalized.slotId || s.id === normalized.slotId);
    if (slot) slot.isAvailable = false;
  }
  writeLocalStore();

  return normalized;
}

async function getBookingById(id) {
  readLocalStore();
  const localMatch = inMemoryStore.bookings.find((b) => b._id === id || b.id === id);

  if (supabase && isUUID(id)) {
    try {
      const { data, error } = await supabase.from("bookings").select("*").eq("id", id).maybeSingle();
      if (!error && data) {
        const supaNorm = normalizeBooking(data);
        if (localMatch) {
          const supaTime = new Date(supaNorm.updatedAt || supaNorm.createdAt || 0).getTime();
          const localTime = new Date(localMatch.updatedAt || localMatch.createdAt || 0).getTime();
          if (localTime > supaTime) {
            return normalizeBooking({ ...supaNorm, ...localMatch });
          }
        }
        return supaNorm;
      }
    } catch (err) {
      console.warn("[supabaseDb] getBookingById Supabase query fallback:", err?.message);
    }
  }
  return localMatch ? normalizeBooking(localMatch) : null;
}

async function lookupBooking(id, email) {
  const normId = String(id || "").trim();
  const normEmail = String(email || "").trim().toLowerCase();
  readLocalStore();

  const found = inMemoryStore.bookings.find(
    (b) =>
      (b._id === normId || b.id === normId) &&
      String(b.email || "").toLowerCase() === normEmail
  );
  if (found) return normalizeBooking(found);

  if (supabase) {
    try {
      let query = supabase.from("bookings").select("*").eq("email", normEmail);
      if (isUUID(normId)) {
        query = query.eq("id", normId);
      }
      const { data } = await query;
      if (Array.isArray(data) && data.length > 0) {
        const match = data.find((row) => row.id === normId || String(row.id).startsWith(normId)) || data[0];
        if (match) {
          const normalized = normalizeBooking(match);
          inMemoryStore.bookings.unshift(normalized);
          writeLocalStore();
          return normalized;
        }
      }
    } catch (err) {
      console.warn("[supabaseDb] lookupBooking Supabase query fallback:", err?.message);
    }
  }
  return null;
}

async function listBookings(params = {}) {
  readLocalStore();
  if (supabase) {
    try {
      let query = supabase.from("bookings").select("*").order("created_at", { ascending: false });
      if (params.status) query = query.eq("status", params.status);
      if (params.paymentStatus) query = query.eq("payment_status", params.paymentStatus);
      if (params.dateFrom && params.dateTo) {
        query = query.gte("date", params.dateFrom).lte("date", params.dateTo);
      } else if (params.dateFrom) {
        query = query.gte("date", params.dateFrom);
      } else if (params.date) {
        query = query.eq("date", params.date);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        const supaList = data.map(normalizeBooking);
        const supaIds = new Set(supaList.map((b) => b._id));

        const localById = new Map();
        for (const lb of inMemoryStore.bookings) {
          if (lb._id) localById.set(lb._id, lb);
          if (lb.id) localById.set(lb.id, lb);
        }

        // Overlay any newer local edits onto Supabase records
        const mergedSupaList = supaList.map((supaB) => {
          const localMatch = localById.get(supaB._id);
          if (localMatch) {
            const supaTime = new Date(supaB.updatedAt || supaB.createdAt || 0).getTime();
            const localTime = new Date(localMatch.updatedAt || localMatch.createdAt || 0).getTime();
            if (localTime > supaTime) {
              return normalizeBooking({ ...supaB, ...localMatch });
            }
          }
          return supaB;
        });

        const localOnly = inMemoryStore.bookings
          .filter((b) => !supaIds.has(b._id) && !supaIds.has(b.id))
          .map(normalizeBooking);

        let combined = [...mergedSupaList, ...localOnly];
        if (params.status) {
          combined = combined.filter((b) => b.status === params.status);
        }
        if (params.paymentStatus) {
          combined = combined.filter((b) => b.paymentStatus === params.paymentStatus);
        }
        if (params.search) {
          const q = String(params.search).toLowerCase();
          combined = combined.filter((b) =>
            String(b.customerName || "").toLowerCase().includes(q) ||
            String(b.phone || "").includes(q) ||
            String(b.email || "").toLowerCase().includes(q) ||
            String(b.carModel || "").toLowerCase().includes(q) ||
            String(b._id || "").toLowerCase().includes(q)
          );
        }
        return combined;
      }
    } catch (err) {
      console.warn("[supabaseDb] listBookings Supabase query fallback:", err?.message);
    }
  }

  // Fallback to local store with safe filtering
  let list = inMemoryStore.bookings.map(normalizeBooking);
  if (params.status) {
    list = list.filter((b) => b.status === params.status);
  }
  if (params.paymentStatus) {
    list = list.filter((b) => b.paymentStatus === params.paymentStatus);
  }
  if (params.dateFrom && params.dateTo) {
    list = list.filter((b) => b.date >= params.dateFrom && b.date <= params.dateTo);
  } else if (params.dateFrom) {
    list = list.filter((b) => b.date >= params.dateFrom);
  } else if (params.date) {
    list = list.filter((b) => b.date === params.date);
  }
  if (params.search) {
    const q = String(params.search).toLowerCase();
    list = list.filter((b) =>
      String(b.customerName || "").toLowerCase().includes(q) ||
      String(b.phone || "").includes(q) ||
      String(b.email || "").toLowerCase().includes(q) ||
      String(b.carModel || "").toLowerCase().includes(q) ||
      String(b._id || "").toLowerCase().includes(q)
    );
  }
  return list;
}

async function updateBooking(id, updates) {
  readLocalStore();
  let booking = inMemoryStore.bookings.find((b) => b._id === id || b.id === id);
  const now = new Date().toISOString();

  // Normalize updates to simultaneously populate both camelCase and snake_case
  const fullUpdates = { ...updates };
  if (fullUpdates.finalAmount !== undefined) fullUpdates.final_amount = Number(fullUpdates.finalAmount);
  if (fullUpdates.final_amount !== undefined) fullUpdates.finalAmount = Number(fullUpdates.final_amount);
  if (fullUpdates.paymentStatus !== undefined) fullUpdates.payment_status = fullUpdates.paymentStatus;
  if (fullUpdates.payment_status !== undefined) fullUpdates.paymentStatus = fullUpdates.payment_status;
  if (fullUpdates.paymentMethod !== undefined) fullUpdates.payment_method = fullUpdates.paymentMethod;
  if (fullUpdates.payment_method !== undefined) fullUpdates.paymentMethod = fullUpdates.payment_method;
  if (fullUpdates.paymentReference !== undefined) fullUpdates.payment_reference = fullUpdates.paymentReference;
  if (fullUpdates.payment_reference !== undefined) fullUpdates.paymentReference = fullUpdates.payment_reference;
  if (fullUpdates.paymentReceivedYmd !== undefined) fullUpdates.payment_received_ymd = fullUpdates.paymentReceivedYmd;
  if (fullUpdates.payment_received_ymd !== undefined) fullUpdates.paymentReceivedYmd = fullUpdates.payment_received_ymd;

  if (booking) {
    Object.assign(booking, fullUpdates, { updatedAt: now, updated_at: now });
    writeLocalStore();
  }

  if (supabase) {
    try {
      const supaUpdates = {};
      if (fullUpdates.status) supaUpdates.status = fullUpdates.status;
      if (fullUpdates.payment_status) supaUpdates.payment_status = fullUpdates.payment_status;
      if (fullUpdates.final_amount !== undefined) supaUpdates.final_amount = Number(fullUpdates.final_amount);
      if (fullUpdates.payment_method !== undefined) supaUpdates.payment_method = String(fullUpdates.payment_method).trim();
      if (fullUpdates.payment_reference !== undefined) supaUpdates.payment_reference = String(fullUpdates.payment_reference).trim();
      if (fullUpdates.payment_received_ymd !== undefined) supaUpdates.payment_received_ymd = String(fullUpdates.payment_received_ymd).trim();
      supaUpdates.updated_at = now;

      if (isUUID(id) && Object.keys(supaUpdates).length > 0) {
        const { data, error } = await supabase.from("bookings").update(supaUpdates).eq("id", id).select().single();
        if (!error && data) {
          booking = normalizeBooking(data);
          const idx = inMemoryStore.bookings.findIndex((b) => b._id === id || b.id === id);
          if (idx >= 0) inMemoryStore.bookings[idx] = booking;
          else inMemoryStore.bookings.unshift(booking);
          writeLocalStore();
        }
      }
    } catch (err) {
      console.warn("[supabaseDb] updateBooking Supabase update fallback:", err?.message);
    }
  }

  return booking ? normalizeBooking(booking) : { _id: id, id, ...fullUpdates };
}

/**
 * =========================================================================
 * QUOTES & QUICK ENQUIRIES
 * =========================================================================
 */
async function createQuote(payload) {
  const id = `QT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const now = new Date().toISOString();

  const normalized = {
    _id: id,
    id: id,
    requestKind: payload.requestKind || "quotation",
    status: payload.requestKind === "enquiry" ? "Pending" : "Submitted",
    customerName: String(payload.customerName || payload.customer_name || "").trim(),
    email: String(payload.email || "").trim().toLowerCase(),
    phone: String(payload.phone || "").trim(),
    vehicleType: payload.vehicleType || "Sedan",
    carMake: String(payload.carMake || "").trim(),
    carModel: String(payload.carModel || "").trim(),
    vehicleYear: Number(payload.vehicleYear || new Date().getFullYear()),
    serviceId: payload.serviceId || null,
    serviceNameSnapshot: payload.serviceNameSnapshot || "Custom Work",
    serviceDescription: String(payload.serviceDescription || "").trim(),
    partsNotes: String(payload.partsNotes || "").trim(),
    enquiryTopic: String(payload.enquiryTopic || "").trim(),
    preferredContact: payload.preferredContact || "either",
    urgency: payload.urgency || "routine",
    quotedAmount: null,
    quoteNotes: "",
    messages: [
      {
        _id: `msg-${Date.now()}`,
        role: "customer",
        body: payload.serviceDescription || "Quote request submitted",
        createdAt: now,
      },
    ],
    lastThreadActivityAt: now,
    createdAt: now,
    updatedAt: now,
  };

  // Try Supabase insert
  if (supabase) {
    try {
      await supabase.from("quotes").insert([
        {
          request_kind: normalized.requestKind,
          customer_name: normalized.customerName,
          email: normalized.email,
          phone: normalized.phone,
          vehicle_type: normalized.vehicleType,
          car_make: normalized.carMake,
          car_model: normalized.carModel,
          vehicle_year: normalized.vehicleYear,
          service_description: normalized.serviceDescription,
          parts_notes: normalized.partsNotes,
          status: normalized.status,
          enquiry_topic: normalized.enquiryTopic,
          preferred_contact: normalized.preferredContact,
          urgency: normalized.urgency,
          messages: normalized.messages,
        },
      ]);
    } catch (supaErr) {
      console.warn("[supabaseDb] Supabase quote insert fallback:", supaErr?.message);
    }
  }

  inMemoryStore.quotes.unshift(normalized);
  writeLocalStore();

  return {
    ...normalized,
    emailSent: { customer: true, workshop: true },
  };
}

async function getQuoteById(id) {
  readLocalStore();
  const match = inMemoryStore.quotes.find((q) => q._id === id || q.id === id);
  if (match) return match;

  if (supabase) {
    try {
      const { data } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
      if (data) {
        return {
          _id: data.id,
          id: data.id,
          requestKind: data.request_kind,
          customerName: data.customer_name,
          email: data.email,
          phone: data.phone,
          vehicleType: data.vehicle_type,
          carMake: data.car_make,
          carModel: data.car_model,
          vehicleYear: data.vehicle_year,
          serviceDescription: data.service_description,
          partsNotes: data.parts_notes,
          status: data.status,
          quotedAmount: data.quoted_amount ? Number(data.quoted_amount) : undefined,
          quoteNotes: data.quote_notes || "",
          quotedAt: data.quoted_at,
          enquiryTopic: data.enquiry_topic,
          preferredContact: data.preferred_contact,
          urgency: data.urgency,
          messages: data.messages || [],
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch {
      // Fallback
    }
  }
  return null;
}

async function lookupQuote(id, email) {
  const normId = String(id || "").trim();
  const normEmail = String(email || "").trim().toLowerCase();
  const all = inMemoryStore.quotes;
  const match = all.find(
    (q) =>
      (q._id === normId || q.id === normId) &&
      String(q.email || "").toLowerCase() === normEmail
  );
  if (match) return match;

  if (supabase) {
    try {
      const { data } = await supabase
        .from("quotes")
        .select("*")
        .eq("email", normEmail)
        .maybeSingle();
      if (data && (data.id === normId || String(data.id).startsWith(normId))) {
        return getQuoteById(data.id);
      }
    } catch {
      // Fallback
    }
  }
  return null;
}

async function listQuotes(params = {}) {
  readLocalStore();
  let list = inMemoryStore.quotes;
  if (params.requestKind) {
    list = list.filter((q) => q.requestKind === params.requestKind);
  }
  if (params.status) {
    list = list.filter((q) => q.status === params.status);
  }
  return list;
}

async function updateQuote(id, updates) {
  readLocalStore();
  const quote = inMemoryStore.quotes.find((q) => q._id === id || q.id === id);
  if (quote) {
    Object.assign(quote, updates, { updatedAt: new Date().toISOString() });
    writeLocalStore();
  }
  if (supabase) {
    try {
      const supaUpdates = {};
      if (updates.status) supaUpdates.status = updates.status;
      if (updates.quotedAmount !== undefined) supaUpdates.quoted_amount = updates.quotedAmount;
      if (updates.quoteNotes !== undefined) supaUpdates.quote_notes = updates.quoteNotes;
      if (updates.quotedAt) supaUpdates.quoted_at = updates.quotedAt;
      if (updates.messages) supaUpdates.messages = updates.messages;
      if (Object.keys(supaUpdates).length > 0) {
        await supabase.from("quotes").update(supaUpdates).eq("id", id);
      }
    } catch {
      // Fallback
    }
  }
  return quote;
}

async function addQuoteMessage(id, messageData) {
  const quote = await getQuoteById(id);
  if (!quote) return null;
  const msg = {
    _id: `msg-${Date.now()}`,
    role: messageData.role || "customer",
    body: String(messageData.body || messageData.message || "").trim(),
    createdAt: new Date().toISOString(),
  };
  const nextMessages = [...(quote.messages || []), msg];
  return updateQuote(id, {
    messages: nextMessages,
    lastThreadActivityAt: msg.createdAt,
    status: messageData.role === "customer" ? "Submitted" : quote.status,
  });
}

/**
 * =========================================================================
 * SHOP PRODUCTS & ORDERS
 * =========================================================================
 */
async function getShopProducts() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("shop_products")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((p) => ({
          _id: p.id,
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description || "",
          productGroup: p.product_group,
          category: p.category,
          image: p.image,
          basePrice: Number(p.base_price || 0),
          discountPercent: Number(p.discount_percent || 0),
          effectivePrice: Math.round(Number(p.base_price || 0) * (1 - Number(p.discount_percent || 0) / 100)),
          stock: p.stock,
          isActive: p.is_active,
          sortOrder: p.sort_order,
        }));
      }
    } catch {
      // Fallback
    }
  }
  return inMemoryStore.shopProducts.filter((p) => p.isActive !== false);
}

async function createShopOrder(payload) {
  const orderNumber = `DL-ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const now = new Date().toISOString();

  const lines = (payload.items || []).map((item) => {
    const prod = inMemoryStore.shopProducts.find((p) => p._id === item.productId || p.id === item.productId || p.slug === item.productId);
    const unitPrice = prod ? prod.effectivePrice || prod.basePrice : 500;
    const qty = Number(item.qty || 1);
    return {
      productId: item.productId,
      name: prod ? prod.name : "Shop Item",
      productGroup: prod?.productGroup || "accessory",
      category: prod?.category || "Accessories",
      qty,
      unitPriceList: prod?.basePrice || unitPrice,
      discountPercent: prod?.discountPercent || 0,
      unitPriceEffective: unitPrice,
      lineTotal: unitPrice * qty,
    };
  });

  const totalInr = lines.reduce((sum, l) => sum + l.lineTotal, 0);

  const order = {
    _id: orderNumber,
    id: orderNumber,
    orderNumber,
    orderDateYmd: now.slice(0, 10),
    customerName: String(payload.customerName || "").trim(),
    email: String(payload.email || "").trim().toLowerCase(),
    phone: String(payload.phone || "").trim(),
    address: String(payload.address || "").trim(),
    customerNote: String(payload.customerNote || "").trim(),
    items: lines,
    subtotalListInr: totalInr,
    discountInr: 0,
    totalInr,
    status: "confirmed",
    paymentStatus: "unpaid",
    createdAt: now,
  };

  if (supabase) {
    try {
      await supabase.from("shop_orders").insert([
        {
          order_number: order.orderNumber,
          customer_name: order.customerName,
          email: order.email,
          phone: order.phone,
          shipping_address: order.address,
          items: order.items,
          subtotal_inr: order.subtotalListInr,
          total_inr: order.totalInr,
          status: order.status,
          payment_status: order.paymentStatus,
        },
      ]);
    } catch (supaErr) {
      console.warn("[supabaseDb] Supabase order insert fallback:", supaErr?.message);
    }
  }

  inMemoryStore.shopOrders.unshift(order);
  writeLocalStore();

  return order;
}

async function listShopOrders() {
  readLocalStore();
  return inMemoryStore.shopOrders;
}

async function updateShopOrder(id, updates) {
  readLocalStore();
  const order = inMemoryStore.shopOrders.find((o) => o._id === id || o.id === id || o.orderNumber === id);
  if (order) {
    Object.assign(order, updates, { updatedAt: new Date().toISOString() });
    writeLocalStore();
  }
  if (supabase) {
    try {
      const supaUpdates = {};
      if (updates.status) supaUpdates.status = updates.status;
      if (updates.paymentStatus) supaUpdates.payment_status = updates.paymentStatus;
      if (Object.keys(supaUpdates).length > 0) {
        await supabase.from("shop_orders").update(supaUpdates).or(`order_number.eq.${id},id.eq.${id}`);
      }
    } catch {
      // Fallback
    }
  }
  return order;
}

/**
 * =========================================================================
 * EMPLOYEES
 * =========================================================================
 */
async function getEmployees() {
  readLocalStore();
  return inMemoryStore.employees;
}

async function createEmployee(data) {
  readLocalStore();
  const emp = {
    _id: `emp-${Date.now()}`,
    id: `emp-${Date.now()}`,
    name: String(data.name || "").trim(),
    email: String(data.email || "").trim(),
    phone: String(data.phone || "").trim(),
    role: String(data.role || "Technician").trim(),
    isActive: true,
  };
  inMemoryStore.employees.push(emp);
  writeLocalStore();
  return emp;
}

async function updateEmployee(id, data) {
  readLocalStore();
  const emp = inMemoryStore.employees.find((e) => e._id === id || e.id === id);
  if (emp) {
    Object.assign(emp, data);
    writeLocalStore();
  }
  return emp;
}

async function deleteEmployee(id) {
  readLocalStore();
  inMemoryStore.employees = inMemoryStore.employees.filter((e) => e._id !== id && e.id !== id);
  writeLocalStore();
  return true;
}

/**
 * =========================================================================
 * REVIEWS
 * =========================================================================
 */
async function getReviews() {
  readLocalStore();
  return inMemoryStore.reviews;
}

async function createReview(data) {
  readLocalStore();
  const rev = {
    _id: `rev-${Date.now()}`,
    id: `rev-${Date.now()}`,
    customerName: String(data.customerName || data.name || "").trim(),
    rating: Number(data.rating || 5),
    comment: String(data.comment || "").trim(),
    serviceName: String(data.serviceName || "").trim(),
    createdAt: new Date().toISOString(),
    isApproved: true,
  };
  inMemoryStore.reviews.unshift(rev);
  writeLocalStore();
  return rev;
}

module.exports = {
  getSupabaseClient: () => supabase,
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getSlots,
  createBooking,
  getBookingById,
  lookupBooking,
  listBookings,
  updateBooking,
  createQuote,
  getQuoteById,
  lookupQuote,
  listQuotes,
  updateQuote,
  addQuoteMessage,
  getShopProducts,
  createShopOrder,
  listShopOrders,
  updateShopOrder,
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getReviews,
  createReview,
};
