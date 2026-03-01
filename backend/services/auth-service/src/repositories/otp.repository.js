import { OtpChallenge } from "../models/OtpChallenge.model.js";

export const createChallenge = async (payload) => OtpChallenge.create(payload);

export const findLatestActiveChallenge = async ({ email, purpose }) =>
  OtpChallenge.findOne({
    email: email.toLowerCase(),
    purpose,
    verifiedAt: null,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

export const markChallengeVerified = async (id) =>
  OtpChallenge.findByIdAndUpdate(id, { verifiedAt: new Date() }, { new: true });
