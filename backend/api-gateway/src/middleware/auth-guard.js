import { env } from "../config/env.js";

const PUBLIC_ROUTE_KEYS = new Set([
  "GET /gateway/info",
  "POST /auth/send-otp",
  "POST /auth/verify-otp",
  "POST /auth/verify-token"
]);

const normalizePath = (pathValue) => {
  if (!pathValue || pathValue === "/") {
    return "/";
  }

  return pathValue.endsWith("/") ? pathValue.slice(0, -1) : pathValue;
};

const isPublicRoute = (method, pathValue) => {
  if (method.toUpperCase() === "OPTIONS") {
    return true;
  }

  const key = `${method.toUpperCase()} ${normalizePath(pathValue)}`;
  return PUBLIC_ROUTE_KEYS.has(key);
};

const extractBearerToken = (authorizationHeader) => {
  if (!authorizationHeader || typeof authorizationHeader !== "string") {
    return "";
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
    return "";
  }

  return token.trim();
};

const verifyTokenWithAuthService = async ({ idToken, requestId }) => {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, env.authVerifyTimeoutMs);

  try {
    const response = await fetch(`${env.authServiceUrl}/api/v1/auth/verify-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(requestId ? { "x-request-id": requestId } : {})
      },
      body: JSON.stringify({ idToken }),
      signal: abortController.signal
    });

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const authGuardMiddleware = async (req, res, next) => {
  if (isPublicRoute(req.method, req.path)) {
    return next();
  }

  const idToken = extractBearerToken(req.headers.authorization);
  if (!idToken) {
    return res.status(401).json({
      message: "Missing or invalid Authorization header. Use: Bearer <Firebase ID token>."
    });
  }

  try {
    const response = await verifyTokenWithAuthService({
      idToken,
      requestId: req.id
    });

    if (response.status === 401 || response.status === 400) {
      return res.status(401).json({
        message: "Invalid or expired token."
      });
    }

    if (!response.ok) {
      return res.status(503).json({
        message: "Authentication service is currently unavailable."
      });
    }

    const identity = await response.json();
    if (!identity?.uid) {
      return res.status(401).json({
        message: "Token verification failed."
      });
    }

    req.user = {
      uid: identity.uid,
      email: identity.email || "",
      emailVerified: Boolean(identity.emailVerified)
    };

    return next();
  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(503).json({
        message: "Authentication service timeout."
      });
    }

    console.error("auth-guard error:", error.message);
    return res.status(503).json({
      message: "Authentication service is currently unavailable."
    });
  }
};
