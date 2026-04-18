const mongoose = require("mongoose");

const quoteRequestSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    /** Optional legacy one-line vehicle text. */
    vehicleHint: { type: String, default: "", trim: true },
    vehicleType: { type: String, enum: ["Hatchback", "Sedan", "SUV"] },
    carMake: { type: String, default: "", trim: true },
    carModel: { type: String, default: "", trim: true },
    vehicleYear: { type: Number },
    /** Published service package, if chosen (otherwise custom work). */
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
    /** Snapshot of package name when submitted (survives catalog edits). */
    serviceNameSnapshot: { type: String, default: "", trim: true },
    /** Extra notes for a package, or full description for custom work. */
    serviceDescription: { type: String, default: "", trim: true },
    /** Parts they believe need replacement. */
    partsNotes: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["Submitted", "Quoted", "Accepted", "Declined", "Closed"],
      default: "Submitted",
    },
    /** Quoted price in INR (set by admin). */
    quotedAmount: { type: Number },
    /** Breakdown, terms, validity — shown to customer. */
    quoteNotes: { type: String, default: "", trim: true },
    quotedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuoteRequest", quoteRequestSchema);
