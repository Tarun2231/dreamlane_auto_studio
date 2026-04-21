/* eslint-disable @typescript-eslint/no-require-imports */
const { ObjectId } = require("mongodb");
const clientPromise = require("../../../lib/mongodb");

const VEHICLE_TYPES = new Set(["Hatchback", "Sedan", "SUV"]);
const PREFERRED_CONTACT = new Set(["email", "phone", "either"]);
const URGENCY = new Set(["routine", "soon", "urgent"]);
const CUSTOM_SERVICE = "__custom__";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const customerName = String(body.customerName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();

    if (!customerName || !email || !phone) {
      return res.status(400).json({ message: "Name, email, and phone are required." });
    }

    const requestKind = body.requestKind === "enquiry" ? "enquiry" : "quotation";
    const serviceIdRaw = String(body.serviceId || "").trim();
    const serviceId = ObjectId.isValid(serviceIdRaw) ? new ObjectId(serviceIdRaw) : null;

    const now = new Date();
    const doc = {
      requestKind,
      customerName,
      email,
      phone,
      vehicleHint: String(body.vehicleHint || "").trim(),
      vehicleType: VEHICLE_TYPES.has(String(body.vehicleType || "")) ? String(body.vehicleType) : "Sedan",
      carMake: String(body.carMake || "").trim(),
      carModel: String(body.carModel || "").trim(),
      vehicleYear: Number(body.vehicleYear || 0) || undefined,
      serviceId: serviceIdRaw && serviceIdRaw !== CUSTOM_SERVICE ? serviceId : null,
      serviceNameSnapshot: String(body.serviceNameSnapshot || "").trim(),
      serviceDescription: String(body.serviceDescription || "").trim(),
      partsNotes: String(body.partsNotes || "").trim(),
      status: "Submitted",
      quoteNotes: "",
      enquiryTopic: String(body.enquiryTopic || "").trim().slice(0, 160),
      preferredContact: PREFERRED_CONTACT.has(String(body.preferredContact || ""))
        ? String(body.preferredContact)
        : "either",
      urgency: URGENCY.has(String(body.urgency || "")) ? String(body.urgency) : "routine",
      messages: [],
      lastThreadActivityAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const client = await clientPromise;
    const dbName = process.env.MONGO_DB_NAME || "car-service";
    const db = client.db(dbName);
    const inserted = await db.collection("quoterequests").insertOne(doc);

    return res.status(201).json({
      _id: String(inserted.insertedId),
      emailSent: { customer: false, workshop: false },
    });
  } catch (error) {
    console.error("POST /api/quote-request failed:", error);
    return res.status(500).json({ message: "Could not submit quote request." });
  }
};
