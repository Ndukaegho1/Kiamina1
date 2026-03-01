import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: String,
      required: true,
      index: true
    },
    fileName: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ["expenses", "sales", "bank-statements", "other"],
      required: true
    },
    className: {
      type: String,
      default: ""
    },
    tags: {
      type: [String],
      default: []
    },
    storageProvider: {
      type: String,
      enum: ["firebase", "s3", "local", "unknown"],
      default: "unknown"
    },
    storagePath: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["processing", "to-review", "ready"],
      default: "processing"
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

documentSchema.index({ ownerUserId: 1, createdAt: -1 });

export const Document = mongoose.model("Document", documentSchema);
