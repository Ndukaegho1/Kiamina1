import crypto from "node:crypto";
import { env } from "../config/env.js";
import {
  createChallenge,
  findLatestActiveChallenge,
  markChallengeVerified
} from "../repositories/otp.repository.js";

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000)
    .toString()
    .padStart(6, "0");

const hashOtp = (otp) =>
  crypto.createHash("sha256").update(`${otp}:${env.otpHashSecret}`).digest("hex");

export const issueOtpChallenge = async ({ email, purpose }) => {
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000);

  const challenge = await createChallenge({
    email: email.toLowerCase(),
    purpose,
    otpHash: hashOtp(otp),
    expiresAt
  });

  return {
    challengeId: challenge.id,
    expiresAt,
    otp
  };
};

export const verifyOtpChallenge = async ({ email, purpose, otp }) => {
  const challenge = await findLatestActiveChallenge({ email, purpose });

  if (!challenge) {
    return { success: false, reason: "No active OTP challenge found." };
  }

  if (challenge.otpHash !== hashOtp(otp)) {
    return { success: false, reason: "Invalid OTP." };
  }

  await markChallengeVerified(challenge.id);
  return { success: true };
};
