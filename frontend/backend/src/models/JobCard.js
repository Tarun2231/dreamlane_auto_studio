const mongoose = require("mongoose");

const jobCardSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },
    servicesDone: [{ type: String }],
    partsUsed: [{ type: String }],
    extraCharges: { type: Number, default: 0 },
    /** Purchase cost of spare parts / materials for this job (INR). Used for profit on dashboard. */
    partsCostInr: { type: Number, default: 0 },
    /** Other direct costs: oil, consumables, sublet labour, etc. (INR). */
    miscCostsInr: { type: Number, default: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("JobCard", jobCardSchema);
