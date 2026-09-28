import mongoose from "mongoose";

const LeadSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    company: { type: String },
    mobile: { type: String, required: true },
    alternateMobile: { type: String },
    email: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    leadSource: { type: String },
    productService: { type: String },
    leadStatus: {
      type: String,
      enum: [
        "NEW",
        "CONTACTED",
        "FOLLOW_UP",
        "INTERESTED",
        "POSITIVE",
        "NOT_INTERESTED",
        "CONVERTED",
        "LOST",
      ],
      default: "NEW",
    },
    followUpDate: { type: String }, // YYYY-MM-DD
    remarks: { type: String },
    notes: { type: String },
    requirement: { type: String },
    expectedValue: { type: Number },
    employeeId: { type: String, required: true }, // The sales employee who created it
    createdBy: { type: String },
  },
  { timestamps: true }
);

export const Lead = mongoose.models.Lead || mongoose.model("Lead", LeadSchema);
