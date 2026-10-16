/* eslint-disable @typescript-eslint/no-require-imports */
const { getServices } = require("../../../lib/supabaseDb");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const services = await getServices();
    return res.status(200).json(services);
  } catch (error) {
    console.error("GET /api/services error:", error?.message);
    return res.status(200).json([]);
  }
};
