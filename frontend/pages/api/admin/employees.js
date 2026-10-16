/* eslint-disable @typescript-eslint/no-require-imports */
const { getEmployees, createEmployee, updateEmployee, deleteEmployee } = require("../../../lib/supabaseDb");
const { requireAdmin } = require("./_auth");

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    try {
      const emps = await getEmployees();
      return res.status(200).json(emps);
    } catch (error) {
      console.error("GET /api/admin/employees error:", error);
      return res.status(500).json({ message: "Could not load employees." });
    }
  }

  if (req.method === "POST") {
    try {
      const emp = await createEmployee(req.body);
      return res.status(201).json(emp);
    } catch (error) {
      console.error("POST /api/admin/employees error:", error);
      return res.status(500).json({ message: "Could not add employee." });
    }
  }

  if (req.method === "PUT") {
    try {
      const { id } = req.query;
      const emp = await updateEmployee(id, req.body);
      return res.status(200).json(emp);
    } catch (error) {
      console.error("PUT /api/admin/employees error:", error);
      return res.status(500).json({ message: "Could not update employee." });
    }
  }

  if (req.method === "DELETE") {
    try {
      const { id } = req.query;
      await deleteEmployee(id);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("DELETE /api/admin/employees error:", error);
      return res.status(500).json({ message: "Could not delete employee." });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
};
