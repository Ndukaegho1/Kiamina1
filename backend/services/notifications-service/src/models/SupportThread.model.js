import mongoose from "mongoose";

const THREAD_SOURCES = ["support", "chatbot"];
const THREAD_STATUSES = ["active", "archived", "closed"];

const supportThreadSchema = new mongoose.Schema(
  {
    threadId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    ticketId: {
      type: String,
      required: true,
      index: true
    },
    ownerUserId: {
      type: String,
      required: true,
      index: true
    },
    participants: {
      type: [String],
      default: []
    },
    source: {
      type: String,
      enum: THREAD_SOURCES,
      default: "support"
    },
    status: {
      type: String,
      enum: THREAD_STATUSES,
      default: "active",
      index: true
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true
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

supportThreadSchema.index({ ticketId: 1, createdAt: -1 });

export const SupportThread = mongoose.model("SupportThread", supportThreadSchema);
