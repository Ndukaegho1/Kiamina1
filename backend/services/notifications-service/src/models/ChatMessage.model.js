import mongoose from "mongoose";

const ROLES = ["user", "assistant", "system", "tool"];
const SOURCES = ["llm", "knowledge-base", "rule-engine", "user", "system"];

const citationSchema = new mongoose.Schema(
  {
    articleId: { type: String, default: "" },
    title: { type: String, default: "" },
    url: { type: String, default: "" }
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ROLES,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    source: {
      type: String,
      enum: SOURCES,
      default: "user"
    },
    tokensPrompt: {
      type: Number,
      min: 0,
      default: 0
    },
    tokensCompletion: {
      type: Number,
      min: 0,
      default: 0
    },
    latencyMs: {
      type: Number,
      min: 0,
      default: 0
    },
    citations: {
      type: [citationSchema],
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

chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
