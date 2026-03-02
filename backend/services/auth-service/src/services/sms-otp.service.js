import crypto from "node:crypto";
import { env } from "../config/env.js";
import {
  createSmsOtpChallenge,
  findLatestActiveSmsOtpChallenge,
  incrementSmsOtpChallengeAttempts,
  markSmsOtpChallengeVerified
} from "../repositories/sms-otp.repository.js";

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000)
    .toString()
    .padStart(6, "0");

const hashSmsOtp = ({ otp, phoneNumber, purpose, email, currentEmail }) =>
  crypto
    .createHash("sha256")
    .update(
      `${otp}:${phoneNumber}:${purpose}:${email || ""}:${currentEmail || ""}:${env.otpHashSecret}`
    )
    .digest("hex");

export const issueSmsOtpChallenge = async ({
  phoneNumber,
  purpose,
  email = "",
  currentEmail = ""
}) => {
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + env.smsOtpExpiryMinutes * 60 * 1000);

  const challenge = await createSmsOtpChallenge({
    phoneNumber,
    purpose,
    email: email.toLowerCase(),
    currentEmail: currentEmail.toLowerCase(),
    otpHash: hashSmsOtp({
      otp,
      phoneNumber,
      purpose,
      email: email.toLowerCase(),
      currentEmail: currentEmail.toLowerCase()
    }),
    expiresAt
  });

  return {
    requestId: challenge.id,
    expiresAt,
    otp
  };
};

export const verifySmsOtpChallenge = async ({
  phoneNumber,
  purpose,
  otp,
  email = "",
  currentEmail = ""
}) => {
  const challenge = await findLatestActiveSmsOtpChallenge({
    phoneNumber,
    purpose,
    email: email.toLowerCase(),
    currentEmail: currentEmail.toLowerCase()
  });

  if (!challenge) {
    return {
      success: false,
      reason: "No active SMS OTP challenge found."
    };
  }

  if (challenge.attempts >= env.smsOtpMaxAttempts) {
    return {
      success: false,
      reason: "Maximum OTP attempts exceeded. Request a new code."
    };
  }

  const incomingHash = hashSmsOtp({
    otp,
    phoneNumber,
    purpose,
    email: email.toLowerCase(),
    currentEmail: currentEmail.toLowerCase()
  });

  if (incomingHash !== challenge.otpHash) {
    await incrementSmsOtpChallengeAttempts(challenge.id);
    return {
      success: false,
      reason: "Invalid OTP."
    };
  }

  await markSmsOtpChallengeVerified(challenge.id);
  return {
    success: true
  };
};
