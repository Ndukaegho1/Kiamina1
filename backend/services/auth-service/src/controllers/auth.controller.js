import { env } from "../config/env.js";
import { issueOtpChallenge, verifyOtpChallenge } from "../services/otp.service.js";
import { verifyFirebaseIdToken } from "../services/firebase-admin.service.js";
import {
  validateSendOtpPayload,
  validateVerifyOtpPayload,
  validateVerifyTokenPayload
} from "../validation/auth.validation.js";

const normalizeRoles = (decodedToken) => {
  const rawRoles = decodedToken?.roles ?? decodedToken?.role;

  if (Array.isArray(rawRoles)) {
    return [...new Set(rawRoles.map((role) => String(role).trim().toLowerCase()).filter(Boolean))];
  }

  if (typeof rawRoles === "string") {
    return [
      ...new Set(
        rawRoles
          .split(",")
          .map((role) => role.trim().toLowerCase())
          .filter(Boolean)
      )
    ];
  }

  return [];
};

export const sendOtp = async (req, res, next) => {
  try {
    const { errors, payload } = validateSendOtpPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const result = await issueOtpChallenge(payload);

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
    const { errors, payload } = validateVerifyOtpPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const result = await verifyOtpChallenge(payload);
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
    const { idToken, error } = validateVerifyTokenPayload(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    if (!decoded) {
      return res.status(401).json({
        message:
          "Token verification failed. Configure Firebase Admin credentials and retry."
      });
    }

    const roles = normalizeRoles(decoded);

    return res.status(200).json({
      uid: decoded.uid,
      email: decoded.email || null,
      emailVerified: Boolean(decoded.email_verified),
      authTime: decoded.auth_time || null,
      roles
    });
  } catch (error) {
    return next(error);
  }
};
