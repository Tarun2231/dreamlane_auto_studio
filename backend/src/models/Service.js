const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    basePrice: { type: Number, required: true },
    duration: { type: Number, required: true },
    /** Months after a completed visit to suggest the next service (e.g. 12 for annual general service). Omit or 0 = no auto-reminder. */
    followUpMonths: { type: Number, default: undefined },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);
