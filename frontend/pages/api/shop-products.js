/* eslint-disable @typescript-eslint/no-require-imports */
const { getShopProducts } = require("../../lib/supabaseDb");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const products = await getShopProducts();
    return res.status(200).json(products);
  } catch (error) {
    console.error("GET /api/shop-products error:", error);
    return res.status(200).json([]);
  }
};
