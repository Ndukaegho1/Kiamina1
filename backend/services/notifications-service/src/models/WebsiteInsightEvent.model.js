import mongoose from "mongoose";

const EVENT_CATEGORIES = ["visit", "interaction"];

const websiteInsightEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    sessionId: {
      type: String,
      required: true,
      index: true
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    category: {
      type: String,
      enum: EVENT_CATEGORIES,
      required: true,
      index: true
    },
    page: {
      type: String,
      default: "",
      trim: true,
      index: true
    },
    targetType: {
      type: String,
      default: "",
      trim: true,
      index: true
    },
    targetId: {
      type: String,
      default: "",
      trim: true
    },
    targetLabel: {
      type: String,
      default: "",
      trim: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: "",
      trim: true
    },
    country: {
      type: String,
      default: "",
      trim: true
    },
    userAgent: {
      type: String,
      default: "",
      trim: true
    }
  },
  {
    timestamps: true
  }
);

websiteInsightEventSchema.index({ createdAt: -1, category: 1 });
websiteInsightEventSchema.index({ page: 1, eventType: 1, createdAt: -1 });
websiteInsightEventSchema.index({ targetType: 1, targetLabel: 1, createdAt: -1 });

export const WebsiteInsightEvent = mongoose.model(
  "WebsiteInsightEvent",
  websiteInsightEventSchema
);
