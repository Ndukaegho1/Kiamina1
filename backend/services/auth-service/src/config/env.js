import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const nodeEnv = process.env.NODE_ENV || "development";
const candidateFiles = [`.env.${nodeEnv}`, ".env"];

for (const file of candidateFiles) {
  const filePath = path.resolve(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath });
    break;
  }
}

const parseCsv = (value) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  nodeEnv,
  serviceName: process.env.SERVICE_NAME || "auth-service",
  port: toNumber(process.env.PORT, 4101),
  corsOrigins: parseCsv(process.env.CORS_ORIGINS),
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017",
  mongoDbName: process.env.MONGO_DB_NAME || "kiamina_auth",
  otpHashSecret: process.env.OTP_HASH_SECRET || "local-dev-otp-secret",
  otpExpiryMinutes: toNumber(process.env.OTP_EXPIRY_MINUTES, 10),
  smsOtpExpiryMinutes: toNumber(process.env.SMS_OTP_EXPIRY_MINUTES, 5),
  smsOtpMaxAttempts: toNumber(process.env.SMS_OTP_MAX_ATTEMPTS, 5),
  loginLockoutMaxFailedAttempts: toNumber(
    process.env.LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS,
    5
  ),
  loginLockoutMinutes: toNumber(process.env.LOGIN_LOCKOUT_MINUTES, 15),
  authTokenSecret: process.env.AUTH_TOKEN_SECRET || "local-dev-auth-token-secret",
  accessTokenTtlMinutes: toNumber(process.env.ACCESS_TOKEN_TTL_MINUTES, 15),
  refreshTokenTtlDays: toNumber(process.env.REFRESH_TOKEN_TTL_DAYS, 7),
  authCookieDomain: process.env.AUTH_COOKIE_DOMAIN || "",
  notificationsServiceUrl: process.env.NOTIFICATIONS_SERVICE_URL || "http://localhost:4104",
  notificationsServiceTimeoutMs: toNumber(process.env.NOTIFICATIONS_SERVICE_TIMEOUT_MS, 5000),
  firebaseWebApiKey:
    process.env.FIREBASE_WEB_API_KEY ||
    process.env.VITE_FIREBASE_WEB_API_KEY ||
    "",
  googleApplicationCredentials:
    process.env.GOOGLE_APPLICATION_CREDENTIALS || "",
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || ""
};
