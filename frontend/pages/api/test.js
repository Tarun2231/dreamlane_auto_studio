import clientPromise from "../../lib/mongodb";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("car-service");

    const result = await db.collection("test").insertOne({
      message: "MongoDB working",
      time: new Date(),
    });

    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
