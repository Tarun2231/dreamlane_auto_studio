/* eslint-disable @typescript-eslint/no-require-imports */
const { requireAdmin } = require("../_auth");
const { getSupabaseClient } = require("../../../../lib/supabaseDb");

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  const id = String(req.query.id || "");
  if (!id) return res.status(400).json({ message: "Invalid service id." });

  const supabase = getSupabaseClient();

  if (req.method === "DELETE") {
    try {
      if (supabase) {
        await supabase.from("services").delete().eq("id", id);
      }
      return res.status(204).end();
    } catch (error) {
      console.error("DELETE /api/admin/service/[id] failed:", error);
      return res.status(500).json({ message: "Could not delete service." });
    }
  }

  if (req.method === "PUT") {
    try {
      const { name, description, image, basePrice, duration, followUpMonths } = req.body || {};
      const update = {
        name: String(name || "").trim(),
        description: String(description || "").trim(),
        image: String(image || "").trim() || "/images/services/placeholder-service.png",
        base_price: Number(basePrice || 0),
        duration: Number(duration || 60),
        follow_up_months: followUpMonths ? Number(followUpMonths) : null,
        updated_at: new Date(),
      };

      if (supabase) {
        await supabase.from("services").update(update).eq("id", id);
      }

      return res.status(200).json({
        _id: id,
        id,
        name: update.name,
        description: update.description,
        image: update.image,
        basePrice: update.base_price,
        duration: update.duration,
        followUpMonths: update.follow_up_months,
      });
    } catch (error) {
      console.error("PUT /api/admin/service/[id] failed:", error);
      return res.status(500).json({ message: "Could not update service." });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
};
