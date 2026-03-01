import { env } from "../config/env.js";

const buildHeaders = () => ({
  Authorization: `Bearer ${env.upstashRestToken}`
});

const callUpstash = async (commandPath) => {
  const baseUrl = env.upstashRestUrl.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}${commandPath}`, {
    method: "POST",
    headers: buildHeaders()
  });

  if (!response.ok) {
    throw new Error(`Upstash request failed with status ${response.status}`);
  }

  return response.json();
};

export const rateLimitMiddleware = async (req, res, next) => {
  if (!env.upstashRestUrl || !env.upstashRestToken) {
    return next();
  }

  const ipAddress =
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
    req.socket.remoteAddress ||
    "unknown";
  const bucket = Math.floor(Date.now() / 60000);
  const key = `gateway:ratelimit:${ipAddress}:${bucket}`;
  const encodedKey = encodeURIComponent(key);

  try {
    const result = await callUpstash(`/incr/${encodedKey}`);
    const currentCount = Number(result.result || 0);

    if (currentCount === 1) {
      void callUpstash(`/expire/${encodedKey}/60`);
    }

    if (currentCount > env.requestsPerMinute) {
      return res.status(429).json({
        message: "Too many requests. Please try again shortly."
      });
    }
  } catch (error) {
    console.error("Rate limit middleware warning:", error.message);
  }

  return next();
};
