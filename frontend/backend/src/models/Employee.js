const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    /** New canonical name field used by admin UI; mirrors fullName for backward compatibility. */
    name: { type: String, default: "", trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    roleTitle: { type: String, default: "", trim: true },
    joinedOn: { type: String, default: "" }, // YYYY-MM-DD
    details: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    monthlySalaryInr: { type: Number, default: 0, min: 0 },
    salaryPaidForMonth: { type: String, default: "" }, // YYYY-MM
    salaryPaidAt: { type: Date, default: null },
    salaryLedger: {
      type: [
        {
          month: { type: String, required: true }, // YYYY-MM
          amountInr: { type: Number, required: true, min: 0 },
          status: { type: String, enum: ["paid", "partial", "unpaid"], default: "unpaid" },
          paidOn: { type: String, default: "" }, // YYYY-MM-DD
          note: { type: String, default: "" },
        },
      ],
      default: [],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Employee", employeeSchema);
