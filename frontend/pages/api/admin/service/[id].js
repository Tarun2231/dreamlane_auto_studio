/* eslint-disable @typescript-eslint/no-require-imports */
const { requireAdmin } = require("../_auth");
const { updateService, deleteService } = require("../../../../lib/supabaseDb");

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  const id = String(req.query.id || "").trim();
  if (!id) return res.status(400).json({ message: "Invalid service id." });

  if (req.method === "DELETE") {
    try {
      await deleteService(id);
      return res.status(204).end();
    } catch (error) {
      console.error("DELETE /api/admin/service/[id] failed:", error);
      return res.status(500).json({ message: "Could not delete service." });
    }
  }

  if (req.method === "PUT") {
    try {
      const updates = req.body || {};
      if (updates.name !== undefined && !String(updates.name).trim()) {
        return res.status(400).json({ message: "Name cannot be empty." });
      }
      if (updates.description !== undefined && !String(updates.description).trim()) {
        return res.status(400).json({ message: "Description cannot be empty." });
      }

      const updated = await updateService(id, updates);
      return res.status(200).json(updated);
    } catch (error) {
      console.error("PUT /api/admin/service/[id] failed:", error);
      return res.status(500).json({ message: "Could not update service." });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
};
