const mongoose = require("mongoose");

const lineItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "ShopProduct", required: true },
    name: { type: String, required: true },
    productGroup: { type: String, enum: ["machine", "accessory", "other"], default: "accessory" },
    category: { type: String, default: "" },
    qty: { type: Number, required: true, min: 1 },
    unitPriceList: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    unitPriceEffective: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const shopOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    /** YYYY-MM-DD in server local TZ — for dashboard filters */
    orderDateYmd: { type: String, required: true, index: true },
    customerName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, default: "" },
    customerNote: { type: String, default: "" },
    items: { type: [lineItemSchema], required: true },
    subtotalListInr: { type: Number, required: true, min: 0 },
    discountInr: { type: Number, required: true, min: 0 },
    totalInr: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "fulfilled", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

shopOrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ShopOrder", shopOrderSchema);
