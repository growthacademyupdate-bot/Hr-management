import mongoose from "mongoose";

const RcsMarketingReportSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    reportDate: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

RcsMarketingReportSchema.index({ employeeId: 1, reportDate: -1 }, { unique: true });
RcsMarketingReportSchema.index({ reportDate: -1, createdAt: -1 });

export const RcsMarketingReport =
  mongoose.models.RcsMarketingReport ||
  mongoose.model("RcsMarketingReport", RcsMarketingReportSchema);
