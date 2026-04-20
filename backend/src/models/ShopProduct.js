const mongoose = require("mongoose");

const shopProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    /**
     * machine = equipment (e.g. wash bay, carbon cleaning machine)
     * accessory = car-related parts: lights, batteries, bulbs, etc.
     * other = anything else
     */
    productGroup: {
      type: String,
      enum: ["machine", "accessory", "other"],
      default: "accessory",
      index: true,
    },
    /** e.g. Headlights, Batteries, Wrapping — sub-type within the group */
    category: { type: String, default: "General", trim: true },
    image: { type: String, default: "" },
    basePrice: { type: Number, required: true, min: 0 },
    /** 0–100; sale price = basePrice * (1 - discountPercent/100) */
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    /** Units available; omit or leave unset on older docs = not tracked (unlimited for checkout). */
    stock: { type: Number, min: 0 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

shopProductSchema.index({ isActive: 1, sortOrder: -1, createdAt: -1 });

module.exports = mongoose.model("ShopProduct", shopProductSchema);
