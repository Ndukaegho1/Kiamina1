import { env } from "../config/env.js";
import { issueOtpChallenge, verifyOtpChallenge } from "../services/otp.service.js";
import { verifyFirebaseIdToken } from "../services/firebase-admin.service.js";

export const sendOtp = async (req, res, next) => {
  try {
    const { email, purpose = "login" } = req.body;
    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }

    const result = await issueOtpChallenge({ email, purpose });

    return res.status(202).json({
      message: "OTP challenge created.",
      challengeId: result.challengeId,
      expiresAt: result.expiresAt,
      previewOtp: env.nodeEnv === "production" ? undefined : result.otp
    });
  } catch (error) {
    return next(error);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { email, purpose = "login", otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "email and otp are required" });
    }

    const result = await verifyOtpChallenge({ email, purpose, otp });
    if (!result.success) {
      return res.status(400).json({ message: result.reason });
    }

    return res.status(200).json({
      message: "OTP verified successfully."
    });
  } catch (error) {
    return next(error);
  }
};

export const verifyToken = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "idToken is required" });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    if (!decoded) {
      return res.status(401).json({
        message:
          "Token verification failed. Configure Firebase Admin credentials and retry."
      });
    }

    return res.status(200).json({
      uid: decoded.uid,
      email: decoded.email || null,
      emailVerified: Boolean(decoded.email_verified),
      authTime: decoded.auth_time || null
    });
  } catch (error) {
    return next(error);
  }
};
