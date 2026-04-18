const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const inspectionSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },
    beforeImages: [imageSchema],
    afterImages: [imageSchema],
    timestamps: [{ type: Date }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inspection", inspectionSchema);
