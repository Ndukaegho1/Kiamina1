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
  serviceName: process.env.SERVICE_NAME || "api-gateway",
  port: toNumber(process.env.PORT, 4100),
  corsOrigins: parseCsv(process.env.CORS_ORIGINS),
  authServiceUrl: process.env.AUTH_SERVICE_URL || "http://localhost:4101",
  usersServiceUrl: process.env.USERS_SERVICE_URL || "http://localhost:4102",
  documentsServiceUrl:
    process.env.DOCUMENTS_SERVICE_URL || "http://localhost:4103",
  notificationsServiceUrl:
    process.env.NOTIFICATIONS_SERVICE_URL || "http://localhost:4104",
  upstashRestUrl: process.env.UPSTASH_REDIS_REST_URL || "",
  upstashRestToken: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  requestsPerMinute: toNumber(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE, 120),
  authVerifyTimeoutMs: toNumber(process.env.AUTH_VERIFY_TIMEOUT_MS, 5000)
};
