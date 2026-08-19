import mongoose from "mongoose";

const LeaveSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true },
  type: { type: String, enum: ["Casual Leave", "Sick Leave", "Earned Leave", "Emergency Leave", "Other"], required: true },
  startDate: { type: String, required: true }, // Mapped to From Date in UI
  endDate: { type: String, required: true },   // Mapped to To Date in UI
  numberOfDays: { type: Number, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ["pending", "hr_approved", "hr_rejected", "admin_approved", "admin_rejected", "cancelled"], default: "pending" },
  appliedAt: { type: String, required: true },
  
  hrReviewedBy: { type: String, default: null },
  hrReviewedAt: { type: String, default: null },
  hrReviewComment: { type: String, default: null },
  
  adminReviewedBy: { type: String, default: null },
  adminReviewedAt: { type: String, default: null },
  adminReviewComment: { type: String, default: null },
  
  cancelledBy: { type: String, default: null },
  cancelledAt: { type: String, default: null },
}, { timestamps: true });

delete mongoose.models.Leave;
export const Leave = mongoose.models.Leave || mongoose.model("Leave", LeaveSchema);
