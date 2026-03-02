import crypto from "node:crypto";
import {
  findAuthAccountByEmail,
  findAuthAccountByUid,
  updateAuthAccountLoginMeta,
  upsertAuthAccountByUid
} from "../repositories/auth-accounts.repository.js";
import { createAuthSession } from "../repositories/auth-sessions.repository.js";

const createNotFoundError = (message) => {
  const error = new Error(message);
  error.status = 404;
  return error;
};

const createConflictError = (message) => {
  const error = new Error(message);
  error.status = 409;
  return error;
};

const createForbiddenError = (message) => {
  const error = new Error(message);
  error.status = 403;
  return error;
};

const generateLocalUid = () => `local_${crypto.randomUUID().replace(/-/g, "")}`;

const generateSessionId = () => crypto.randomUUID().replace(/-/g, "");

export const registerOrUpdateAuthAccount = async ({
  uid,
  email,
  fullName,
  role,
  provider,
  status,
  emailVerified,
  phoneVerified
}) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const existingByUid = uid ? await findAuthAccountByUid(uid) : null;
  const existingByEmail = normalizedEmail ? await findAuthAccountByEmail(normalizedEmail) : null;

  if (existingByUid && existingByEmail && existingByUid.uid !== existingByEmail.uid) {
    throw createConflictError("The supplied uid and email are linked to different accounts.");
  }

  if (!existingByUid && uid && existingByEmail && existingByEmail.uid !== uid) {
    throw createConflictError("The supplied email already belongs to another account.");
  }

  const existing = existingByUid || existingByEmail;

  const resolvedUid = existing?.uid || uid || generateLocalUid();
  const now = new Date();

  const account = await upsertAuthAccountByUid({
    uid: resolvedUid,
    payload: {
      uid: resolvedUid,
      email: normalizedEmail,
      fullName: fullName || existing?.fullName || "",
      role: role || existing?.role || "client",
      provider: provider || existing?.provider || "email-password",
      status: status || existing?.status || "active",
      emailVerified: typeof emailVerified === "boolean" ? emailVerified : Boolean(existing?.emailVerified),
      phoneVerified: typeof phoneVerified === "boolean" ? phoneVerified : Boolean(existing?.phoneVerified),
      onboardingStartedAt: existing?.onboardingStartedAt || now
    }
  });

  return {
    account,
    created: !existing
  };
};

export const createLoginSessionRecord = async ({
  uid,
  email,
  loginMethod,
  sessionTtlMinutes,
  ipAddress,
  userAgent,
  deviceFingerprint,
  mfaCompleted,
  tokenHash,
  role
}) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  let account = uid ? await findAuthAccountByUid(uid) : null;
  if (!account && normalizedEmail) {
    account = await findAuthAccountByEmail(normalizedEmail);
  }

  if (!account) {
    if (!normalizedEmail) {
      throw createNotFoundError("No account found for the supplied uid/email.");
    }

    const created = await registerOrUpdateAuthAccount({
      uid,
      email: normalizedEmail,
      fullName: "",
      role: role || "client",
      provider: "email-password",
      status: "active",
      emailVerified: false,
      phoneVerified: false
    });

    account = created.account;
  }

  if (account.status !== "active") {
    throw createForbiddenError(`Cannot create login session for account status: ${account.status}.`);
  }

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + sessionTtlMinutes * 60 * 1000);

  const session = await createAuthSession({
    sessionId: generateSessionId(),
    uid: account.uid,
    email: account.email,
    role: account.role,
    loginMethod,
    issuedAt,
    expiresAt,
    ipAddress: ipAddress || "",
    userAgent: userAgent || "",
    deviceFingerprint: deviceFingerprint || "",
    mfaCompleted: Boolean(mfaCompleted),
    tokenHash: tokenHash || ""
  });

  await updateAuthAccountLoginMeta({
    uid: account.uid,
    lastLoginAt: issuedAt,
    lastLoginIp: ipAddress || "",
    lastLoginUserAgent: userAgent || "",
    lastLoginMethod: loginMethod
  });

  return {
    account,
    session
  };
};
