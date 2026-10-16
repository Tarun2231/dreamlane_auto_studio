/* eslint-disable @typescript-eslint/no-require-imports */
const { getServices } = require("../../../lib/supabaseDb");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const includeInactive = req.query.all === "true" || req.query.all === "1" || req.query.includeInactive === "true";
    const services = await getServices(includeInactive);
    return res.status(200).json(services);
  } catch (error) {
    console.error("GET /api/services error:", error?.message);
    return res.status(200).json([]);
  }
};
