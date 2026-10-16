/* eslint-disable @typescript-eslint/no-require-imports */
const { createShopOrder, listShopOrders } = require("../../../lib/supabaseDb");

module.exports = async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const payload = req.body || {};
      const { customerName, email, phone, items } = payload;
      if (!customerName || !email || !phone) {
        return res.status(400).json({ message: "Name, email, and phone are required." });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Cart items are required to place an order." });
      }

      const order = await createShopOrder(payload);
      return res.status(201).json({ order, success: true });
    } catch (error) {
      console.error("POST /api/shop/orders error:", error);
      return res.status(500).json({ message: "Could not create order. Please try again." });
    }
  }

  if (req.method === "GET") {
    try {
      const orders = await listShopOrders();
      return res.status(200).json(orders);
    } catch (error) {
      console.error("GET /api/shop/orders error:", error);
      return res.status(500).json({ message: "Could not load orders." });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
};
