import mongoose from "mongoose";

const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUSES = ["open", "in-progress", "waiting-user", "resolved", "closed"];
const CHANNELS = ["web", "email", "chatbot", "api"];

const supportTicketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    ownerUserId: {
      type: String,
      required: true,
      index: true
    },
    ownerEmail: {
      type: String,
      default: "",
      lowercase: true,
      trim: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: "",
      trim: true
    },
    priority: {
      type: String,
      enum: PRIORITIES,
      default: "medium",
      index: true
    },
    status: {
      type: String,
      enum: STATUSES,
      default: "open",
      index: true
    },
    channel: {
      type: String,
      enum: CHANNELS,
      default: "web"
    },
    tags: {
      type: [String],
      default: []
    },
    assignedToUid: {
      type: String,
      default: "",
      index: true
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    openedAt: {
      type: Date,
      default: Date.now
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    closedAt: {
      type: Date,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

supportTicketSchema.index({ ownerUserId: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: 1, updatedAt: -1 });

export const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);
