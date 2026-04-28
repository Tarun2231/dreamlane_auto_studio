const mongoose = require("mongoose");

const quoteRequestSchema = new mongoose.Schema(
  {
    /** `enquiry` = homepage quick form; `quotation` = full Get quote flow (default for legacy docs). */
    requestKind: { type: String, enum: ["enquiry", "quotation"], default: "quotation" },
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
      /** Pending = active back-and-forth before a formal price is sent. */
      enum: ["Submitted", "Pending", "Quoted", "Accepted", "Declined", "Closed"],
      default: "Submitted",
    },
    /** Quoted price in INR (set by admin). */
    quotedAmount: { type: Number },
    /** Breakdown, terms, validity — shown to customer. */
    quoteNotes: { type: String, default: "", trim: true },
    quotedAt: { type: Date },
    /** Optional homepage / quick enquiry metadata */
    enquiryTopic: { type: String, default: "", trim: true, maxlength: 160 },
    preferredContact: { type: String, enum: ["email", "phone", "either"], default: "either" },
    urgency: { type: String, enum: ["routine", "soon", "urgent"], default: "routine" },
    /** Customer ↔ admin conversation (after initial enquiry). */
    messages: [
      {
        role: { type: String, enum: ["customer", "admin"], required: true },
        body: { type: String, required: true, trim: true, maxlength: 8000 },
        attachments: [
          {
            kind: { type: String, enum: ["image", "pdf"], required: true },
            url: { type: String, required: true, trim: true, maxlength: 600 },
            name: { type: String, default: "", trim: true, maxlength: 180 },
            sizeBytes: { type: Number, min: 0, default: 0 },
            mimeType: { type: String, default: "", trim: true, maxlength: 120 },
          },
        ],
        createdAt: { type: Date, default: Date.now },
        adminLabel: { type: String, default: "", trim: true, maxlength: 80 },
      },
    ],
    /** Bumps when a new thread message is posted (sort inbox by recent activity). */
    lastThreadActivityAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuoteRequest", quoteRequestSchema);
