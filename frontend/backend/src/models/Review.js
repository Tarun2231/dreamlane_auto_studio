const mongoose = require("mongoose");

/**
 * Customer-submitted testimonial tied to a service booking.
 * Only customers who verify booking ID + email may submit; admins approve or reject.
 */
const reviewSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    /** Shown on the site when approved */
    quote: { type: String, required: true, trim: true, minlength: 10, maxlength: 1200 },
    /** Display name, e.g. "Priya K." */
    authorDisplay: { type: String, required: true, trim: true, maxlength: 80 },
    /** Service / context line under the name */
    context: { type: String, default: "", trim: true, maxlength: 120 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ bookingId: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
