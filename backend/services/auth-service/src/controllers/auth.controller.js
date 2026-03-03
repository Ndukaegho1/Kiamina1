import { env } from "../config/env.js";
import { issueOtpChallenge, verifyOtpChallenge } from "../services/otp.service.js";
import { issueSmsOtpChallenge, verifySmsOtpChallenge } from "../services/sms-otp.service.js";
import { verifyFirebaseIdToken } from "../services/firebase-admin.service.js";
import {
  assertActiveSessionForUid,
  createLoginSessionRecord,
  refreshSessionTokenHash,
  registerOrUpdateAuthAccount,
  revokeSessionForUid
} from "../services/auth-accounts.service.js";
import {
  createAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyAccessToken
} from "../services/auth-tokens.service.js";
import {
  dispatchOtpEmail,
  dispatchPasswordResetLink
} from "../services/auth-messaging.service.js";
import {
  validateLogoutSessionPayload,
  validateRefreshTokenPayload,
  validateLoginSessionPayload,
  validateRegisterAccountPayload,
  validateSendPasswordResetLinkPayload,
  validateSendOtpPayload,
  validateSendSmsOtpPayload,
  validateVerifyOtpPayload,
  validateVerifySmsOtpPayload,
  validateVerifyTokenPayload
} from "../validation/auth.validation.js";

const ACCESS_COOKIE_NAME = "kiamina_access_token";
const REFRESH_COOKIE_NAME = "kiamina_refresh_token";
const SESSION_COOKIE_NAME = "kiamina_session_id";

const parseCookieHeader = (cookieHeader = "") =>
  String(cookieHeader || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((accumulator, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex <= 0) {
        return accumulator;
      }
      const key = part.slice(0, separatorIndex).trim();
      const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
      if (key) {
        accumulator[key] = value;
      }
      return accumulator;
    }, {});

const getCookieValue = (req, cookieName) => {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  return String(cookies[cookieName] || "").trim();
};

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

const getRequestIpAddress = (req) =>
  String(
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
      req.socket.remoteAddress ||
      ""
  );

const toCookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: "lax",
  path: "/",
  ...(env.authCookieDomain ? { domain: env.authCookieDomain } : {}),
  maxAge: maxAgeMs
});

const setAuthCookies = ({
  res,
  accessToken,
  accessTokenExpiresAt,
  refreshToken,
  sessionId,
  sessionExpiresAt
}) => {
  const now = Date.now();
  const accessMaxAgeMs = Math.max(
    1,
    (accessTokenExpiresAt instanceof Date
      ? accessTokenExpiresAt.getTime()
      : Date.now() + env.accessTokenTtlMinutes * 60 * 1000) - now
  );
  const sessionMaxAgeMs = Math.max(
    1,
    (sessionExpiresAt instanceof Date
      ? sessionExpiresAt.getTime()
      : Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000) - now
  );

  res.cookie(ACCESS_COOKIE_NAME, accessToken, toCookieOptions(accessMaxAgeMs));
  res.cookie(
    REFRESH_COOKIE_NAME,
    refreshToken,
    {
      ...toCookieOptions(sessionMaxAgeMs),
      path: "/api/v1/auth"
    }
  );
  res.cookie(SESSION_COOKIE_NAME, sessionId, toCookieOptions(sessionMaxAgeMs));
};

const clearAuthCookies = (res) => {
  const baseOptions = {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    ...(env.authCookieDomain ? { domain: env.authCookieDomain } : {})
  };

  res.clearCookie(ACCESS_COOKIE_NAME, {
    ...baseOptions,
    path: "/"
  });
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...baseOptions,
    path: "/api/v1/auth"
  });
  res.clearCookie(SESSION_COOKIE_NAME, {
    ...baseOptions,
    path: "/"
  });
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
    const { idToken, accessToken, sessionId, error } = validateVerifyTokenPayload(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const verifiedAccessToken = accessToken ? verifyAccessToken(accessToken) : null;
    if (verifiedAccessToken) {
      await assertActiveSessionForUid({
        sessionId: verifiedAccessToken.sessionId,
        uid: verifiedAccessToken.uid
      });

      return res.status(200).json({
        uid: verifiedAccessToken.uid,
        email: verifiedAccessToken.email || null,
        emailVerified: true,
        authTime: null,
        roles: normalizeRoles(verifiedAccessToken),
        sessionId: verifiedAccessToken.sessionId || null,
        tokenType: "access-token"
      });
    }

    const decoded = idToken ? await verifyFirebaseIdToken(idToken) : null;
    if (!decoded) {
      return res.status(401).json({
        message: accessToken
          ? "Invalid or expired access token."
          : "Token verification failed. Configure Firebase Admin credentials and retry."
      });
    }

    const resolvedSessionId = sessionId || "";
    if (resolvedSessionId) {
      await assertActiveSessionForUid({
        sessionId: resolvedSessionId,
        uid: decoded.uid
      });
    }

    return res.status(200).json({
      uid: decoded.uid,
      email: decoded.email || null,
      emailVerified: Boolean(decoded.email_verified),
      authTime: decoded.auth_time || null,
      roles: normalizeRoles(decoded),
      sessionId: resolvedSessionId || null,
      tokenType: "firebase-id-token"
    });
  } catch (error) {
    return next(error);
  }
};

export const sendPasswordResetLink = async (req, res, next) => {
  try {
    const { errors, payload } = validateSendPasswordResetLinkPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const dispatchResult = await dispatchPasswordResetLink({
      email: payload.email,
      resetLink: payload.resetLink
    });

    return res.status(202).json({
      message: "Password reset link request accepted.",
      email: payload.email,
      dispatchQueued: Boolean(dispatchResult.queued),
      previewResetLink: env.nodeEnv === "production" ? undefined : payload.resetLink
    });
  } catch (error) {
    return next(error);
  }
};

export const sendSmsOtp = async (req, res, next) => {
  try {
    const { errors, payload } = validateSendSmsOtpPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const result = await issueSmsOtpChallenge(payload);

    return res.status(202).json({
      message: "SMS OTP challenge created.",
      requestId: result.requestId,
      expiresAt: result.expiresAt,
      previewOtp: env.nodeEnv === "production" ? undefined : result.otp
    });
  } catch (error) {
    return next(error);
  }
};

export const verifySmsOtp = async (req, res, next) => {
  try {
    const { errors, payload } = validateVerifySmsOtpPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const result = await verifySmsOtpChallenge(payload);
    if (!result.success) {
      return res.status(400).json({ message: result.reason });
    }

    return res.status(200).json({
      message: "SMS OTP verified successfully."
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

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);

    const result = await createLoginSessionRecord({
      ...payload,
      ipAddress: payload.ipAddress || getRequestIpAddress(req),
      userAgent: payload.userAgent || String(req.headers["user-agent"] || ""),
      tokenHash: refreshTokenHash
    });

    const accessToken = createAccessToken({
      uid: result.account.uid,
      email: result.account.email,
      roles: [result.account.role].filter(Boolean),
      sessionId: result.session.sessionId
    });

    setAuthCookies({
      res,
      accessToken: accessToken.token,
      accessTokenExpiresAt: accessToken.expiresAt,
      refreshToken,
      sessionId: result.session.sessionId,
      sessionExpiresAt: result.session.expiresAt
    });

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
      },
      tokens: {
        accessTokenExpiresAt: accessToken.expiresAt
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { errors, payload } = validateRefreshTokenPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const sessionId = payload.sessionId || getCookieValue(req, SESSION_COOKIE_NAME);
    const incomingRefreshToken = payload.refreshToken || getCookieValue(req, REFRESH_COOKIE_NAME);

    if (!sessionId || !incomingRefreshToken) {
      return res.status(400).json({
        message: "sessionId and refreshToken are required."
      });
    }

    const nextRefreshToken = generateRefreshToken();
    const result = await refreshSessionTokenHash({
      sessionId,
      refreshTokenHash: hashRefreshToken(incomingRefreshToken),
      nextRefreshTokenHash: hashRefreshToken(nextRefreshToken)
    });

    const nextAccessToken = createAccessToken({
      uid: result.account.uid,
      email: result.account.email,
      roles: [result.account.role].filter(Boolean),
      sessionId: result.session.sessionId
    });

    setAuthCookies({
      res,
      accessToken: nextAccessToken.token,
      accessTokenExpiresAt: nextAccessToken.expiresAt,
      refreshToken: nextRefreshToken,
      sessionId: result.session.sessionId,
      sessionExpiresAt: result.session.expiresAt
    });

    return res.status(200).json({
      message: "Access token refreshed successfully.",
      session: {
        sessionId: result.session.sessionId,
        expiresAt: result.session.expiresAt
      },
      tokens: {
        accessTokenExpiresAt: nextAccessToken.expiresAt
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

    const sessionIdFromCookie = getCookieValue(req, SESSION_COOKIE_NAME);
    const { errors, payload } = validateLogoutSessionPayload({
      ...(req.body && typeof req.body === "object" ? req.body : {}),
      sessionId: req.body?.sessionId || sessionIdFromCookie || ""
    });
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const result = await revokeSessionForUid({
      sessionId: payload.sessionId,
      uid: actorUid,
      reason: payload.reason || "logout"
    });
    clearAuthCookies(res);

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
