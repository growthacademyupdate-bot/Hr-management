import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true },
  title: { type: String, required: true },
  category: { 
    type: String, 
    enum: ["Travel", "Office Supplies", "Client Meeting", "Food & Dining", "Equipment", "Other"], 
    required: true 
  },
  amount: { type: Number, required: true },
  expenseDate: { type: String, required: true },
  description: { type: String, required: true },
  receiptUrl: { type: String, default: null },
  status: { 
    type: String, 
    enum: ["pending", "hr_approved", "hr_rejected", "admin_approved", "admin_rejected", "reimbursed", "cancelled"], 
    default: "pending" 
  },
  appliedAt: { type: String, required: true },

  hrReviewedBy: { type: String, default: null },
  hrReviewedAt: { type: String, default: null },
  hrReviewComment: { type: String, default: null },

  adminReviewedBy: { type: String, default: null },
  adminReviewedAt: { type: String, default: null },
  adminReviewComment: { type: String, default: null },

  reimbursedBy: { type: String, default: null },
  reimbursedAt: { type: String, default: null },

  cancelledBy: { type: String, default: null },
  cancelledAt: { type: String, default: null },
}, { timestamps: true });

delete mongoose.models.Expense;
export const Expense = mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);
