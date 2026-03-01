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

const toBoolean = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
};

export const env = {
  nodeEnv,
  serviceName: process.env.SERVICE_NAME || "notifications-service",
  port: toNumber(process.env.PORT, 4104),
  corsOrigins: parseCsv(process.env.CORS_ORIGINS),
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017",
  mongoDbName: process.env.MONGO_DB_NAME || "kiamina_notifications",
  qstashBaseUrl: process.env.QSTASH_BASE_URL || "",
  qstashToken: process.env.QSTASH_TOKEN || "",
  qstashForwardUrl: process.env.QSTASH_FORWARD_URL || "",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: toNumber(process.env.SMTP_PORT, 587),
  smtpSecure: toBoolean(process.env.SMTP_SECURE, false),
  smtpRequireTls: toBoolean(process.env.SMTP_REQUIRE_TLS, true),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFromEmail: process.env.SMTP_FROM_EMAIL || "",
  smtpFromName: process.env.SMTP_FROM_NAME || "Kiamina"
};
