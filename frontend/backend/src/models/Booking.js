const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
    vehicleType: { type: String, enum: ["Hatchback", "Sedan", "SUV"], required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    /** Manufacturer / brand (e.g. Hyundai, Maruti Suzuki). */
    carMake: { type: String, default: "", trim: true },
    carModel: { type: String, required: true },
    /** Legacy: number plate before chassis-only flow. */
    registrationNumber: { type: String, default: "", trim: true },
    /** Chassis number as on RC — for exact parts identification. */
    chassisNumber: { type: String, default: "", trim: true },
    /** Model year (e.g. 2022). */
    vehicleYear: { type: Number },
    finalAmount: { type: Number, default: 0 },
    /** Optional: how the customer paid (for your records; P&L income still uses finalAmount). */
    paymentMethod: { type: String, default: "", trim: true, maxlength: 80 },
    /** Optional: UPI ref, bank ref, receipt #, etc. */
    paymentReference: { type: String, default: "", trim: true, maxlength: 160 },
    /** Optional: YYYY-MM-DD when payment was received. */
    paymentReceivedYmd: { type: String, default: "", trim: true },
    /**
     * Collection / settlement status for this job (manual).
     * unpaid | partial | paid | waived — legacy docs without this field are treated as unpaid.
     */
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid", "waived"],
      default: "unpaid",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
