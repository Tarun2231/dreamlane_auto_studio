const mongoose = require("mongoose");

const sitePresenceSchema = new mongoose.Schema(
  {
    supportStatus: {
      type: String,
      enum: ["online", "offline", "break"],
      default: "online",
    },
    updatedByEmail: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SitePresence", sitePresenceSchema);
