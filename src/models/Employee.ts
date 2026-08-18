import mongoose from "mongoose";

const EmployeeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // e.g. EMP001
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  department: { type: String, required: true },
  designation: { type: String, required: true },
  joiningDate: { type: String, required: true }, // YYYY-MM-DD
  salary: { type: Number, required: true },
  status: { type: String, enum: ["Active", "Inactive", "On Leave"], default: "Active" },
  avatar: { type: String },
  password: { type: String, required: true }, // Simple plain text for now, could hash in real app
}, { timestamps: true });

export const Employee = mongoose.models.Employee || mongoose.model("Employee", EmployeeSchema);
