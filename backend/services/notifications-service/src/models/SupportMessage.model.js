import mongoose from "mongoose";

const SENDER_TYPES = ["user", "agent", "bot", "system"];
const MESSAGE_TYPES = ["text", "system", "event"];
const VISIBILITY_VALUES = ["public", "internal"];

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    url: { type: String, default: "" },
    contentType: { type: String, default: "" },
    size: { type: Number, min: 0, default: 0 }
  },
  { _id: false }
);

const supportMessageSchema = new mongoose.Schema(
  {
    threadId: {
      type: String,
      required: true,
      index: true
    },
    ticketId: {
      type: String,
      required: true,
      index: true
    },
    senderType: {
      type: String,
      enum: SENDER_TYPES,
      required: true
    },
    senderUid: {
      type: String,
      default: ""
    },
    senderDisplayName: {
      type: String,
      default: ""
    },
    messageType: {
      type: String,
      enum: MESSAGE_TYPES,
      default: "text"
    },
    visibility: {
      type: String,
      enum: VISIBILITY_VALUES,
      default: "public"
    },
    content: {
      type: String,
      required: true
    },
    attachments: {
      type: [attachmentSchema],
      default: []
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

supportMessageSchema.index({ threadId: 1, createdAt: 1 });
supportMessageSchema.index({ ticketId: 1, createdAt: 1 });

export const SupportMessage = mongoose.model("SupportMessage", supportMessageSchema);
