import crypto from "node:crypto";
import {
  countAuthAccountsByRoles,
  deleteAuthAccountByUid,
  findAuthAccountByEmail,
  findAuthAccountByUid,
  listAuthAccounts,
  updateAuthAccountLoginMeta,
  upsertAuthAccountByUid
} from "../repositories/auth-accounts.repository.js";
import {
  createAuthSession,
  findActiveAuthSessionBySessionId,
  findAuthSessionBySessionId,
  revokeAuthSession,
  revokeAuthSessionsByUid,
  updateAuthSessionBySessionId
} from "../repositories/auth-sessions.repository.js";
import { compareRefreshTokenHash } from "./auth-tokens.service.js";
import { deleteFirebaseUserByUid } from "./firebase-admin.service.js";

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

const createUnauthorizedError = (message) => {
  const error = new Error(message);
  error.status = 401;
  return error;
};

const generateLocalUid = () => `local_${crypto.randomUUID().replace(/-/g, "")}`;

const generateSessionId = () => crypto.randomUUID().replace(/-/g, "");

export const getOwnerBootstrapEligibility = async () => {
  const adminAccountCount = await countAuthAccountsByRoles([
    "admin",
    "owner",
    "superadmin"
  ]);

  return {
    adminAccountCount,
    canBootstrapOwner: adminAccountCount === 0
  };
};

export const listRegisteredAuthAccounts = async ({
  limit = 200
} = {}) => listAuthAccounts({
  sort: { updatedAt: -1, createdAt: -1 },
  limit
});

export const getRegisteredAuthAccountByEmail = async (email = "") => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }
  return findAuthAccountByEmail(normalizedEmail);
};

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

export const assertActiveSessionForUid = async ({ sessionId, uid }) => {
  if (!sessionId) {
    return null;
  }

  const session = await findActiveAuthSessionBySessionId(sessionId);
  if (!session) {
    throw createUnauthorizedError("Session is invalid, revoked, or expired.");
  }

  if (uid && session.uid !== uid) {
    throw createForbiddenError("Session does not belong to authenticated user.");
  }

  return session;
};

export const revokeSessionForUid = async ({ sessionId, uid, reason = "logout" }) => {
  const session = await findAuthSessionBySessionId(sessionId);
  if (!session) {
    throw createNotFoundError("Session not found.");
  }

  if (uid && session.uid !== uid) {
    throw createForbiddenError("Cannot revoke another user's session.");
  }

  if (session.revokedAt || (session.expiresAt && session.expiresAt <= new Date())) {
    return {
      session,
      revoked: false
    };
  }

  const revokedSession = await revokeAuthSession({
    sessionId,
    reason: reason || "logout"
  });

  return {
    session: revokedSession || session,
    revoked: Boolean(revokedSession)
  };
};

export const refreshSessionTokenHash = async ({
  sessionId,
  refreshTokenHash,
  nextRefreshTokenHash
}) => {
  const session = await findActiveAuthSessionBySessionId(sessionId);
  if (!session) {
    throw createUnauthorizedError("Session is invalid, revoked, or expired.");
  }

  if (!session.tokenHash) {
    throw createUnauthorizedError("Refresh token is not configured for this session.");
  }

  const isMatchingRefreshToken = compareRefreshTokenHash({
    storedHash: session.tokenHash,
    incomingHash: refreshTokenHash
  });

  if (!isMatchingRefreshToken) {
    throw createUnauthorizedError("Refresh token is invalid.");
  }

  const updatedSession = await updateAuthSessionBySessionId(sessionId, {
    tokenHash: nextRefreshTokenHash,
    issuedAt: new Date()
  });

  const account = await findAuthAccountByUid(session.uid);
  if (!account) {
    throw createNotFoundError("Account not found for active session.");
  }

  return {
    account,
    session: updatedSession || session
  };
};

export const deleteAuthAccountForUid = async ({ uid, reason = "account-deleted" }) => {
  const normalizedUid = String(uid || "").trim();
  if (!normalizedUid) {
    throw createUnauthorizedError("Missing authenticated user id.");
  }

  const account = await findAuthAccountByUid(normalizedUid);
  const revokeResult = await revokeAuthSessionsByUid({
    uid: normalizedUid,
    reason
  });
  const firebaseResult = await deleteFirebaseUserByUid(normalizedUid);
  if (!account) {
    return {
      account: null,
      deleted: false,
      revokedSessionCount: Number(revokeResult?.modifiedCount || 0),
      firebase: firebaseResult
    };
  }

  const deletedAccount = await deleteAuthAccountByUid(normalizedUid);
  return {
    account,
    deleted: Boolean(deletedAccount),
    revokedSessionCount: Number(revokeResult?.modifiedCount || 0),
    firebase: firebaseResult
  };
};
