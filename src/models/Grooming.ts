import mongoose from "mongoose";

const GroomingItemSchema = new mongoose.Schema({
  pointId: { type: Number },
  question: { type: String },
  isYes: { type: Boolean },
  remarks: { type: String, default: "" },
}, { _id: false });

const GroomingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true },
  date: { type: String, required: true },
  checkedBy: { type: String, required: true },
  score: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 15 },
  status: { type: String }, // Excellent, Good, Needs Improvement
  items: [GroomingItemSchema],
}, { timestamps: true });

GroomingSchema.index({ employeeId: 1, date: 1 });

export const Grooming = mongoose.models.Grooming || mongoose.model("Grooming", GroomingSchema);
