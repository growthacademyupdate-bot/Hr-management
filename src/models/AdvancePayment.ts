import mongoose from "mongoose";

const AdvancePaymentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  disbursedDate: { type: String, required: true }, // YYYY-MM-DD
  reason: { type: String, default: "" },
  paymentMode: { type: String, default: "Cash" }, // "Bank Transfer", "UPI", "Cash", "Cheque"
  disbursedBy: { type: String, required: true },
  disbursedByRole: { type: String, required: true }, // "admin" | "hr"
  settledAmount: { type: Number, default: 0 },
  settledExpenseId: { type: String, default: null },
  settledAt: { type: String, default: null },
  status: { type: String, enum: ["given", "partially_settled", "settled"], default: "given" },
}, { timestamps: true });

delete mongoose.models.AdvancePayment;
export const AdvancePayment = mongoose.models.AdvancePayment || mongoose.model("AdvancePayment", AdvancePaymentSchema);
