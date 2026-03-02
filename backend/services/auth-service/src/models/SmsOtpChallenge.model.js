import mongoose from "mongoose";

const smsOtpChallengeSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    purpose: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true
    },
    currentEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true
    },
    otpHash: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

smsOtpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
smsOtpChallengeSchema.index({ phoneNumber: 1, purpose: 1, createdAt: -1 });

export const SmsOtpChallenge = mongoose.model("SmsOtpChallenge", smsOtpChallengeSchema);
