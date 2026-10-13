let getSupabase = null;
try {
  getSupabase = require("../../../lib/supabase").getSupabase;
} catch {
  try {
    const { createClient } = require("@supabase/supabase-js");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zjhlymssrpcawajhfpfg.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_VU8pJ3utws5oeU8meFcAHg_bstYju59";
    const client = createClient(supabaseUrl, supabaseKey);
    getSupabase = () => client;
  } catch {
    getSupabase = () => null;
  }
}
const clientPromise = require("../../../lib/mongodb");

const SAMPLE_SERVICES = [
  {
    name: "Basic Service",
    description: "Oil change, basic check-up, and fluid top-up.",
    price: 1999,
    duration: "2 hours",
    isActive: true,
  },
  {
    name: "Premium Detailing",
    description: "Deep interior cleaning and exterior paint protection.",
    price: 4999,
    duration: "5 hours",
    isActive: true,
  },
];

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // 1. Attempt to fetch from Supabase first
  try {
    const supabase = getSupabase();
    const { data: supaServices, error: supaErr } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("base_price", { ascending: true });

    if (!supaErr && Array.isArray(supaServices) && supaServices.length > 0) {
      return res.status(200).json(
        supaServices.map((s) => ({
          _id: s.id,
          id: s.id,
          name: s.name,
          description: s.description,
          price: s.base_price,
          duration: `${s.duration} mins`,
          image: s.image,
          isActive: s.is_active,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
        }))
      );
    }
  } catch (supaEx) {
    // Supabase optional fallback
  }

  // 2. Fallback to MongoDB / Sample Services
  try {
    const client = await clientPromise;
    const dbName = process.env.MONGO_DB_NAME || "car-service";
    const db = client.db(dbName);
    let rows = await db
      .collection("services")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    if (!rows.length) {
      const now = new Date();
      const seeded = SAMPLE_SERVICES.map((s) => ({ ...s, createdAt: now, updatedAt: now }));
      await db.collection("services").insertMany(seeded);
      rows = await db
        .collection("services")
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
    }

    return res.status(200).json(
      rows.map((s) => ({
        ...s,
        _id: String(s._id),
      }))
    );
  } catch (error) {
    // If both Supabase and MongoDB are not responding, return sample services so UI remains functional
    return res.status(200).json(
      SAMPLE_SERVICES.map((s, idx) => ({
        ...s,
        _id: `sample-${idx + 1}`,
      }))
    );
  }
};
