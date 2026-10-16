/* eslint-disable @typescript-eslint/no-require-imports */
const { getEmployees, createEmployee } = require("../../../../lib/supabaseDb");
const { requireAdmin } = require("../_auth");

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    try {
      const emps = await getEmployees();
      return res.status(200).json({
        items: [
          {
            _id: "admin-master-id",
            id: "admin-master-id",
            name: "Master Admin",
            email: "admin@carcare.com",
            phone: "+91 98765 00000",
            role: "owner",
            isActive: true,
          },
          ...emps.map((e) => ({ ...e, role: "admin" })),
        ],
      });
    } catch (error) {
      console.error("GET /api/admin/admins error:", error);
      return res.status(500).json({ message: "Could not load admins." });
    }
  }

  if (req.method === "POST") {
    try {
      const emp = await createEmployee(req.body);
      return res.status(201).json(emp);
    } catch (error) {
      console.error("POST /api/admin/admins error:", error);
      return res.status(500).json({ message: "Could not add admin." });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
};
