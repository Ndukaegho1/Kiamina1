import crypto from "node:crypto";
import { env } from "../config/env.js";

const encodeBase64Url = (value) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const decodeBase64Url = (value) => {
  const normalized = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const withPadding = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(withPadding, "base64").toString("utf8");
};

const signPayload = (value) =>
  crypto.createHmac("sha256", env.authTokenSecret).update(value).digest("base64url");

const buildToken = (claims) => {
  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = encodeBase64Url(JSON.stringify(claims));
  const signature = signPayload(`${header}.${payload}`);
  return `${header}.${payload}.${signature}`;
};

const parseJson = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const secureCompare = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export const generateRefreshToken = () => crypto.randomBytes(48).toString("base64url");

export const hashRefreshToken = (refreshToken) =>
  crypto.createHash("sha256").update(String(refreshToken || "")).digest("hex");

export const compareRefreshTokenHash = ({ storedHash, incomingHash }) =>
  secureCompare(storedHash, incomingHash);

export const createAccessToken = ({
  uid,
  email = "",
  roles = [],
  sessionId = "",
  ttlMinutes = env.accessTokenTtlMinutes
}) => {
  const issuedAtSeconds = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = issuedAtSeconds + Math.max(1, Number(ttlMinutes) || 1) * 60;
  const claims = {
    sub: uid,
    uid,
    email,
    roles: Array.isArray(roles) ? roles : [],
    sid: sessionId,
    iat: issuedAtSeconds,
    exp: expiresAtSeconds
  };

  return {
    token: buildToken(claims),
    expiresAt: new Date(expiresAtSeconds * 1000)
  };
};

export const verifyAccessToken = (accessToken) => {
  const [headerEncoded, payloadEncoded, signature] = String(accessToken || "").split(".");
  if (!headerEncoded || !payloadEncoded || !signature) {
    return null;
  }

  const expectedSignature = signPayload(`${headerEncoded}.${payloadEncoded}`);
  if (!secureCompare(signature, expectedSignature)) {
    return null;
  }

  const header = parseJson(decodeBase64Url(headerEncoded));
  const payload = parseJson(decodeBase64Url(payloadEncoded));
  if (!header || !payload || header.alg !== "HS256" || header.typ !== "JWT") {
    return null;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(payload.exp) || payload.exp <= nowSeconds) {
    return null;
  }

  if (!payload.uid || !payload.sid) {
    return null;
  }

  return {
    uid: String(payload.uid),
    email: String(payload.email || ""),
    roles: Array.isArray(payload.roles) ? payload.roles : [],
    sessionId: String(payload.sid),
    exp: Number(payload.exp)
  };
};
