/* eslint-disable @typescript-eslint/no-require-imports */
const { requireAdmin } = require("../_auth");
const { createService } = require("../../../../lib/supabaseDb");

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { name, description, image, basePrice, duration, followUpMonths } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Name is required." });
    }
    if (!description || !String(description).trim()) {
      return res.status(400).json({ message: "Description is required." });
    }

    const service = await createService({
      name,
      description,
      image,
      basePrice,
      duration,
      followUpMonths,
    });

    return res.status(201).json(service);
  } catch (error) {
    console.error("POST /api/admin/service failed:", error);
    return res.status(500).json({ message: "Could not create service." });
  }
};
