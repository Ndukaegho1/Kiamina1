import mongoose from "mongoose";

const LOGIN_METHODS = ["password", "otp", "google", "token", "invite"];

const authSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true
    },
    uid: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    role: {
      type: String,
      default: "client"
    },
    loginMethod: {
      type: String,
      enum: LOGIN_METHODS,
      default: "token"
    },
    issuedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    revokedAt: {
      type: Date,
      default: null
    },
    revokedReason: {
      type: String,
      default: ""
    },
    ipAddress: {
      type: String,
      default: ""
    },
    userAgent: {
      type: String,
      default: ""
    },
    deviceFingerprint: {
      type: String,
      default: ""
    },
    mfaCompleted: {
      type: Boolean,
      default: false
    },
    tokenHash: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authSessionSchema.index({ uid: 1, issuedAt: -1 });

export const AuthSession = mongoose.model("AuthSession", authSessionSchema);
