const mongoose = require("mongoose");

/** One row per automated “next service due” email sent (avoids duplicates). */
const sentServiceReminderSchema = new mongoose.Schema(
  {
    emailNorm: { type: String, required: true, index: true },
    /** The due date we reminded about (YYYY-MM-DD). */
    reminderDate: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

sentServiceReminderSchema.index({ emailNorm: 1, reminderDate: 1 }, { unique: true });

module.exports = mongoose.model("SentServiceReminder", sentServiceReminderSchema);
