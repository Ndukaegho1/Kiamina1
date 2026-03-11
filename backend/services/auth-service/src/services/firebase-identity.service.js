import { env } from "../config/env.js";

const IDENTITY_TOOLKIT_TIMEOUT_MS = 10000;

const buildServiceUnavailableResult = (reason = "firebase-web-api-key-missing") => ({
  ok: false,
  status: 503,
  code: "service_unavailable",
  reason,
  idToken: "",
  refreshToken: "",
  uid: "",
  email: ""
});

const parseFirebaseErrorCode = (payload = {}) =>
  String(payload?.error?.message || "")
    .trim()
    .toUpperCase();

const requestIdentityToolkit = async ({
  endpoint,
  payload
}) => {
  if (!env.firebaseWebApiKey) {
    return buildServiceUnavailableResult();
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, IDENTITY_TOOLKIT_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/${String(endpoint || "").trim()}?key=${encodeURIComponent(env.firebaseWebApiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload || {}),
        signal: abortController.signal
      }
    );
    const data = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      data,
      code: parseFirebaseErrorCode(data),
      reason: ""
    };
  } catch (error) {
    return {
      ok: false,
      status: error?.name === "AbortError" ? 504 : 503,
      data: {},
      code: "",
      reason: error?.name === "AbortError" ? "request-timeout" : "request-failed"
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

export const signInWithFirebasePassword = async ({
  email,
  password
}) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPassword = String(password || "");
  if (!normalizedEmail || !normalizedPassword) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_INPUT",
      reason: "missing-email-or-password",
      idToken: "",
      refreshToken: "",
      uid: "",
      email: ""
    };
  }

  const response = await requestIdentityToolkit({
    endpoint: "accounts:signInWithPassword",
    payload: {
      email: normalizedEmail,
      password: normalizedPassword,
      returnSecureToken: true
    }
  });
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      code: response.code || "",
      reason: response.reason || "sign-in-failed",
      idToken: "",
      refreshToken: "",
      uid: "",
      email: normalizedEmail
    };
  }

  return {
    ok: true,
    status: 200,
    code: "",
    reason: "",
    idToken: String(response.data?.idToken || "").trim(),
    refreshToken: String(response.data?.refreshToken || "").trim(),
    uid: String(response.data?.localId || "").trim(),
    email: String(response.data?.email || normalizedEmail).trim().toLowerCase()
  };
};
