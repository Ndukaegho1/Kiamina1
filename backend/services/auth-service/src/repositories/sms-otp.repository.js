import { SmsOtpChallenge } from "../models/SmsOtpChallenge.model.js";

export const createSmsOtpChallenge = async (payload) => SmsOtpChallenge.create(payload);

export const findLatestActiveSmsOtpChallenge = async ({
  phoneNumber,
  purpose,
  email = "",
  currentEmail = ""
}) =>
  SmsOtpChallenge.findOne({
    phoneNumber,
    purpose,
    email: email || "",
    currentEmail: currentEmail || "",
    verifiedAt: null,
    expiresAt: {
      $gt: new Date()
    }
  }).sort({ createdAt: -1 });

export const markSmsOtpChallengeVerified = async (id) =>
  SmsOtpChallenge.findByIdAndUpdate(
    id,
    { verifiedAt: new Date() },
    {
      new: true
    }
  );

export const incrementSmsOtpChallengeAttempts = async (id) =>
  SmsOtpChallenge.findByIdAndUpdate(
    id,
    {
      $inc: {
        attempts: 1
      }
    },
    {
      new: true
    }
  );
