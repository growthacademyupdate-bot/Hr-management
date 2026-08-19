import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  assignedTo: { type: String, required: true }, // employee id
  assignedBy: { type: String, required: true }, // admin id
  priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
  status: { type: String, enum: ["assigned", "working_progress", "completed", "reviewed"], default: "assigned" },
  assignDate: { type: String, required: true },
  dueDate: { type: String, required: true },
  startedAt: { type: String, default: null },
  completedAt: { type: String, default: null },
  reviewedAt: { type: String, default: null },
  hrRating: { type: String, enum: ["very good", "good", "average", "poor"], default: null },
  hrReview: { type: String, default: null },
  reviewedBy: { type: String, default: null }, // hr id
  // keeping progress and comments for backwards compatibility or if they want to use them later
  progress: { type: Number, default: 0 },
  comments: [{ 
    author: String, 
    text: String, 
    time: String 
  }],
}, { timestamps: true });

if (mongoose.models.Task) {
  delete mongoose.models.Task;
}
export const Task = mongoose.model("Task", TaskSchema);
