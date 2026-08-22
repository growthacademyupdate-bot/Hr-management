import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  recipientId: { type: String, required: true },
  recipientRole: { type: String }, // Optional optimization/filter
  senderId: { type: String },
  senderRole: { type: String },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, required: true },
  module: { type: String, required: true },
  referenceId: { type: String },
  actionUrl: { type: String },
  isRead: { type: Boolean, default: false },
  readAt: { type: String },
  metadata: { type: Object }
}, { timestamps: true });

// Create indexes for efficient querying
NotificationSchema.index({ recipientId: 1, isRead: 1 });
NotificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
