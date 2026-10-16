/* eslint-disable @typescript-eslint/no-require-imports */
const { requireAdmin } = require("../_auth");
const { createService, getServices } = require("../../../../lib/supabaseDb");

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    try {
      const services = await getServices(true);
      return res.status(200).json(services);
    } catch (error) {
      console.error("GET /api/admin/service failed:", error);
      return res.status(500).json({ message: "Could not load services." });
    }
  }

  if (req.method === "POST") {
    try {
      const { name, description, image, basePrice, duration, followUpMonths, isActive } = req.body || {};
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
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      });

      return res.status(201).json(service);
    } catch (error) {
      console.error("POST /api/admin/service failed:", error);
      return res.status(500).json({ message: "Could not create service." });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
};
