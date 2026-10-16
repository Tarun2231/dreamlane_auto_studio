/* eslint-disable @typescript-eslint/no-require-imports */
const { requireAdmin } = require("../_auth");
const { getSupabaseClient } = require("../../../../lib/supabaseDb");

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { name, description, image, basePrice, duration, followUpMonths } = req.body || {};
    if (!name || !description) return res.status(400).json({ message: "Name and description are required." });

    const payload = {
      name: String(name).trim(),
      description: String(description).trim(),
      image: String(image || "").trim() || "/images/services/placeholder-service.png",
      basePrice: Number(basePrice || 0),
      duration: Number(duration || 60),
      followUpMonths: followUpMonths ? Number(followUpMonths) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const supabase = getSupabaseClient();
    let insertedId = `svc-${Date.now()}`;
    if (supabase) {
      try {
        const { data, error } = await supabase.from("services").insert([{
          name: payload.name,
          description: payload.description,
          image: payload.image,
          base_price: payload.basePrice,
          duration: payload.duration,
          follow_up_months: payload.followUpMonths,
        }]).select().single();
        if (data && data.id) insertedId = data.id;
      } catch (err) {
        console.warn("[admin/service] Supabase insert fallback:", err?.message);
      }
    }

    return res.status(201).json({ ...payload, _id: insertedId, id: insertedId });
  } catch (error) {
    console.error("POST /api/admin/service failed:", error);
    return res.status(500).json({ message: "Could not create service." });
  }
};
