import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  assignedTo: { type: String, required: true }, // employee id
  priority: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
  dueDate: { type: String, required: true },
  status: { type: String, enum: ["Pending", "In Progress", "Completed"], default: "Pending" },
  progress: { type: Number, default: 0 },
  createdAt: { type: String, required: true },
  comments: [{ 
    author: String, 
    text: String, 
    time: String 
  }],
}, { timestamps: true });

export const Task = mongoose.models.Task || mongoose.model("Task", TaskSchema);
