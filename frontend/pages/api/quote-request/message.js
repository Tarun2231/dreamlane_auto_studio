/* eslint-disable @typescript-eslint/no-require-imports */
const { addQuoteMessage } = require("../../../lib/supabaseDb");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id, body, message } = req.body || {};
    if (!id || (!body && !message)) {
      return res.status(400).json({ message: "Quote ID and message body are required." });
    }

    const updated = await addQuoteMessage(String(id), {
      role: "customer",
      body: String(body || message || "").trim(),
    });

    if (!updated) {
      return res.status(404).json({ message: "Quote request not found." });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error("POST /api/quote-request/message error:", error);
    return res.status(500).json({ message: "Error sending message." });
  }
};
