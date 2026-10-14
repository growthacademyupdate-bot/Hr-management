import mongoose from "mongoose";

const DailyTrainingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    employeeId: { type: String, required: true, index: true },
    employeeName: { type: String, required: true },
    designation: { type: String, required: true },
    department: { type: String, default: "" },
    trainingDate: { type: String, required: true, index: true }, // YYYY-MM-DD
    trainingPoints: {
      type: [String],
      required: true,
      validate: {
        validator: function (pts: string[]) {
          return Array.isArray(pts) && pts.length > 0;
        },
        message: "At least one training point is required",
      },
    },
    rawContent: { type: String, default: "" },
    status: { type: String, default: "Submitted" },
    submittedAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

// Unique compound index: One training submission per employee per trainingDate
DailyTrainingSchema.index({ employeeId: 1, trainingDate: 1 }, { unique: true });
DailyTrainingSchema.index({ trainingDate: -1, createdAt: -1 });

export const DailyTraining =
  mongoose.models.DailyTraining ||
  mongoose.model("DailyTraining", DailyTrainingSchema);
