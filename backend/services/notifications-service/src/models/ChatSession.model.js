import mongoose from "mongoose";

const CHAT_CHANNELS = ["web", "whatsapp", "telegram", "api"];
const CHAT_STATUSES = ["active", "closed", "escalated"];

const chatSessionSchema = new mongoose.Schema(
  {
    sessionId: {
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
    channel: {
      type: String,
      enum: CHAT_CHANNELS,
      default: "web"
    },
    status: {
      type: String,
      enum: CHAT_STATUSES,
      default: "active",
      index: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    endedAt: {
      type: Date,
      default: null
    },
    escalatedToTicketId: {
      type: String,
      default: "",
      index: true
    },
    context: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

chatSessionSchema.index({ ownerUserId: 1, startedAt: -1 });

export const ChatSession = mongoose.model("ChatSession", chatSessionSchema);
