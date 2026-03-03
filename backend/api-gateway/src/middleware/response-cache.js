import crypto from "node:crypto";
import { env } from "../config/env.js";

const inMemoryResponseCache = new Map();

const CACHEABLE_CONTENT_TYPE_MARKERS = ["application/json", "text/json"];

const pruneExpiredEntries = () => {
  const now = Date.now();
  for (const [cacheKey, cacheEntry] of inMemoryResponseCache.entries()) {
    if (!cacheEntry || cacheEntry.expiresAt <= now) {
      inMemoryResponseCache.delete(cacheKey);
    }
  }
};

const isRequestCacheable = (req) => {
  if (req.method.toUpperCase() !== "GET") {
    return false;
  }

  const normalizedPath = String(req.path || "").toLowerCase();
  if (normalizedPath.startsWith("/auth")) {
    return false;
  }
  if (normalizedPath.startsWith("/notifications/events/stream")) {
    return false;
  }

  const cacheControlHeader = String(req.headers["cache-control"] || "").toLowerCase();
  if (cacheControlHeader.includes("no-cache") || cacheControlHeader.includes("no-store")) {
    return false;
  }

  return true;
};

const buildCacheKey = (req) => {
  const method = req.method.toUpperCase();
  const route = req.originalUrl || req.url || "";
  const userScope = req.user?.uid ? `uid:${req.user.uid}` : "public";
  const roleScope = Array.isArray(req.user?.roles) ? req.user.roles.join(",") : "";
  const rawKey = `${method}:${route}:${userScope}:${roleScope}`;

  return crypto.createHash("sha256").update(rawKey).digest("hex");
};

const isCacheableResponse = (res, capturedBytesLength) => {
  if (res.statusCode !== 200) {
    return false;
  }

  if (!Number.isFinite(capturedBytesLength) || capturedBytesLength <= 0) {
    return false;
  }

  if (capturedBytesLength > env.responseCacheMaxBodyBytes) {
    return false;
  }

  const contentTypeHeader = String(res.getHeader("content-type") || "").toLowerCase();
  return CACHEABLE_CONTENT_TYPE_MARKERS.some((marker) =>
    contentTypeHeader.includes(marker)
  );
};

const readFromCache = (cacheKey) => {
  const cacheEntry = inMemoryResponseCache.get(cacheKey);
  if (!cacheEntry) {
    return null;
  }

  if (cacheEntry.expiresAt <= Date.now()) {
    inMemoryResponseCache.delete(cacheKey);
    return null;
  }

  return cacheEntry;
};

const writeToCache = ({ cacheKey, payload }) => {
  inMemoryResponseCache.set(cacheKey, {
    ...payload,
    expiresAt: Date.now() + Math.max(1, env.responseCacheTtlSeconds) * 1000
  });
};

export const responseCacheMiddleware = (req, res, next) => {
  if (!isRequestCacheable(req) || env.responseCacheTtlSeconds <= 0) {
    return next();
  }

  pruneExpiredEntries();
  const cacheKey = buildCacheKey(req);
  const cachedEntry = readFromCache(cacheKey);

  if (cachedEntry) {
    res.setHeader("x-cache", "HIT");
    res.status(cachedEntry.statusCode || 200);

    for (const [headerName, headerValue] of Object.entries(cachedEntry.headers || {})) {
      if (!headerName || headerValue === undefined || headerValue === null) {
        continue;
      }
      res.setHeader(headerName, headerValue);
    }

    return res.send(cachedEntry.body || "");
  }

  res.setHeader("x-cache", "MISS");
  const chunks = [];

  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);

  res.write = (chunk, ...args) => {
    if (chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return originalWrite(chunk, ...args);
  };

  res.end = (chunk, ...args) => {
    if (chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    try {
      const responseBodyBuffer = chunks.length > 0 ? Buffer.concat(chunks) : Buffer.from("");
      if (isCacheableResponse(res, responseBodyBuffer.length)) {
        writeToCache({
          cacheKey,
          payload: {
            statusCode: res.statusCode,
            headers: {
              "content-type": res.getHeader("content-type")
            },
            body: responseBodyBuffer.toString("utf8")
          }
        });
      }
    } catch (error) {
      console.error("response-cache middleware warning:", error.message);
    }

    return originalEnd(chunk, ...args);
  };

  return next();
};
