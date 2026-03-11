import mongoose from "mongoose";

const credentialLoginAttemptSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    },
    failedCount: {
      type: Number,
      default: 0,
      min: 0
    },
    firstFailedAt: {
      type: Date,
      default: null
    },
    lastFailedAt: {
      type: Date,
      default: null
    },
    lockUntilAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const CredentialLoginAttempt = mongoose.model(
  "CredentialLoginAttempt",
  credentialLoginAttemptSchema
);
