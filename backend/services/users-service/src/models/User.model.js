import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    },
    displayName: {
      type: String,
      default: ""
    },
    roles: {
      type: [String],
      default: ["client"]
    },
    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active"
    }
  },
  {
    timestamps: true
  }
);

export const User = mongoose.model("User", userSchema);
