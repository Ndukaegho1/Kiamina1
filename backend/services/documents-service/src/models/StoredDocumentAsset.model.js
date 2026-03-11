import mongoose from "mongoose";

const storedDocumentAssetSchema = new mongoose.Schema(
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
    contentType: {
      type: String,
      default: "application/octet-stream"
    },
    size: {
      type: Number,
      required: true,
      min: 0
    },
    buffer: {
      type: Buffer,
      required: true
    }
  },
  {
    timestamps: true
  }
);

storedDocumentAssetSchema.index({ ownerUserId: 1, createdAt: -1 });

export const StoredDocumentAsset = mongoose.model(
  "StoredDocumentAsset",
  storedDocumentAssetSchema
);
