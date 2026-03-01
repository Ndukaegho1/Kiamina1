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
  serviceName: process.env.SERVICE_NAME || "notifications-service",
  port: toNumber(process.env.PORT, 4104),
  corsOrigins: parseCsv(process.env.CORS_ORIGINS),
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017",
  mongoDbName: process.env.MONGO_DB_NAME || "kiamina_notifications",
  qstashBaseUrl: process.env.QSTASH_BASE_URL || "",
  qstashToken: process.env.QSTASH_TOKEN || "",
  qstashForwardUrl: process.env.QSTASH_FORWARD_URL || ""
};
