import mongoose from "mongoose";

const notificationLogSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: ["email", "sms", "push", "webhook"],
      required: true
    },
    to: {
      type: String,
      required: true
    },
    subject: {
      type: String,
      default: ""
    },
    message: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["queued", "sent", "failed"],
      default: "queued",
      index: true
    },
    providerMessageId: {
      type: String,
      default: ""
    },
    scheduledAt: {
      type: Date,
      default: null
    },
    sentAt: {
      type: Date,
      default: null
    },
    errorMessage: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

notificationLogSchema.index({ createdAt: -1 });

export const NotificationLog = mongoose.model(
  "NotificationLog",
  notificationLogSchema
);
