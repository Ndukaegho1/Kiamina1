import { env } from "../config/env.js";
import { issueOtpChallenge, verifyOtpChallenge } from "../services/otp.service.js";
import { verifyFirebaseIdToken } from "../services/firebase-admin.service.js";
import { dispatchOtpEmail } from "../services/auth-messaging.service.js";
import {
  assertActiveSessionForUid,
  createLoginSessionRecord,
  registerOrUpdateAuthAccount,
  revokeSessionForUid
} from "../services/auth-accounts.service.js";
import {
  validateLogoutSessionPayload,
  validateLoginSessionPayload,
  validateRegisterAccountPayload,
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

const getActorUid = (req) => {
  const actorUid = req.headers["x-user-id"];
  return actorUid ? String(actorUid) : "";
};

const OTP_DELIVERY_ERROR_MESSAGES = {
  "notifications-service-url-not-configured":
    "OTP email delivery is not configured on the server.",
  "notification-request-timeout":
    "OTP email delivery timed out while contacting the notifications service.",
  "notification-request-failed":
    "OTP email delivery failed while contacting the notifications service."
};

const formatOtpDeliveryErrorMessage = (reason = "") => {
  const normalizedReason = String(reason || "").trim();
  if (!normalizedReason) {
    return "OTP challenge created but we could not deliver the OTP email.";
  }

  if (OTP_DELIVERY_ERROR_MESSAGES[normalizedReason]) {
    return OTP_DELIVERY_ERROR_MESSAGES[normalizedReason];
  }

  if (normalizedReason.startsWith("notification-service-status-")) {
    const statusCode = normalizedReason.slice("notification-service-status-".length);
    return `OTP email delivery failed with notifications service status ${statusCode}.`;
  }

  return "OTP challenge created but OTP email delivery failed.";
};

export const sendOtp = async (req, res, next) => {
  try {
    const { errors, payload } = validateSendOtpPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const result = await issueOtpChallenge(payload);
    const dispatchResult = await dispatchOtpEmail({
      email: payload.email,
      otp: result.otp,
      purpose: payload.purpose,
      expiryMinutes: env.otpExpiryMinutes
    });

    if (!dispatchResult.queued) {
      if (env.nodeEnv !== "production") {
        return res.status(202).json({
          message:
            "OTP challenge created (development preview enabled because email delivery failed).",
          challengeId: result.challengeId,
          expiresAt: result.expiresAt,
          dispatchQueued: false,
          deliveryError: formatOtpDeliveryErrorMessage(dispatchResult.reason),
          reason: dispatchResult.reason || "notification-request-failed",
          previewOtp: result.otp
        });
      }

      return res.status(502).json({
        message: formatOtpDeliveryErrorMessage(dispatchResult.reason),
        reason: dispatchResult.reason || "notification-request-failed",
        challengeId: result.challengeId,
        expiresAt: result.expiresAt,
        previewOtp: env.nodeEnv === "production" ? undefined : result.otp
      });
    }

    return res.status(202).json({
      message: "OTP challenge created.",
      challengeId: result.challengeId,
      expiresAt: result.expiresAt,
      dispatchQueued: true,
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
    const { idToken, sessionId, error } = validateVerifyTokenPayload(req.body);
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
    if (sessionId) {
      await assertActiveSessionForUid({
        sessionId,
        uid: decoded.uid
      });
    }

    return res.status(200).json({
      uid: decoded.uid,
      email: decoded.email || null,
      emailVerified: Boolean(decoded.email_verified),
      authTime: decoded.auth_time || null,
      roles,
      sessionId: sessionId || null
    });
  } catch (error) {
    return next(error);
  }
};

export const registerAccount = async (req, res, next) => {
  try {
    const { errors, payload } = validateRegisterAccountPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const result = await registerOrUpdateAuthAccount(payload);

    return res.status(result.created ? 201 : 200).json({
      message: result.created ? "Account registration record created." : "Account registration record updated.",
      account: {
        uid: result.account.uid,
        email: result.account.email,
        fullName: result.account.fullName,
        role: result.account.role,
        provider: result.account.provider,
        status: result.account.status,
        emailVerified: Boolean(result.account.emailVerified),
        phoneVerified: Boolean(result.account.phoneVerified),
        lastLoginAt: result.account.lastLoginAt
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const recordLoginSession = async (req, res, next) => {
  try {
    const { errors, payload } = validateLoginSessionPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const result = await createLoginSessionRecord(payload);

    return res.status(201).json({
      message: "Login session recorded.",
      account: {
        uid: result.account.uid,
        email: result.account.email,
        role: result.account.role,
        status: result.account.status
      },
      session: {
        sessionId: result.session.sessionId,
        issuedAt: result.session.issuedAt,
        expiresAt: result.session.expiresAt,
        loginMethod: result.session.loginMethod
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const logoutSession = async (req, res, next) => {
  try {
    const actorUid = getActorUid(req);
    if (!actorUid) {
      return res.status(401).json({
        message: "Missing x-user-id header from authenticated gateway request"
      });
    }

    const { errors, payload } = validateLogoutSessionPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const result = await revokeSessionForUid({
      sessionId: payload.sessionId,
      uid: actorUid,
      reason: payload.reason || "logout"
    });

    return res.status(200).json({
      message: result.revoked ? "Session revoked successfully." : "Session already revoked or expired.",
      session: {
        sessionId: result.session.sessionId,
        uid: result.session.uid,
        revokedAt: result.session.revokedAt || null,
        revokedReason: result.session.revokedReason || payload.reason || "logout"
      }
    });
  } catch (error) {
    return next(error);
  }
};
