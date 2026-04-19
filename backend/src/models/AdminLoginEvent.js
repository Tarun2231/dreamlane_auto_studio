const mongoose = require("mongoose");

const adminLoginEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    email: { type: String, required: true },
    name: { type: String, default: "" },
    at: { type: Date, default: Date.now, index: true },
    ip: { type: String, default: "" },
    locationLabel: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    isoUtc: { type: String, default: "" },
    timezoneLine: { type: String, default: "" },
  },
  { timestamps: false }
);

adminLoginEventSchema.index({ at: -1 });

module.exports = mongoose.model("AdminLoginEvent", adminLoginEventSchema);
