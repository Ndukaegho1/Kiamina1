import { env } from "../config/env.js";
import {
  deleteCredentialLoginAttemptByEmail,
  findCredentialLoginAttemptByEmail,
  upsertCredentialLoginAttemptByEmail
} from "../repositories/credential-login-attempts.repository.js";

export const LOGIN_LOCKOUT_MESSAGE =
  "Your account has been temporarily locked due to multiple failed login attempts.";

const createLockedError = (remainingMs = 0) => {
  const error = new Error(LOGIN_LOCKOUT_MESSAGE);
  error.status = 423;
  error.code = "login-locked";
  error.remainingMs = Math.max(0, Number(remainingMs || 0));
  return error;
};

const resolveLockoutWindowMs = () =>
  Math.max(1, Number(env.loginLockoutMinutes || 15)) * 60 * 1000;

const resolveMaxFailedAttempts = () =>
  Math.max(1, Number(env.loginLockoutMaxFailedAttempts || 5));

export const clearCredentialLoginLockout = async (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return;
  await deleteCredentialLoginAttemptByEmail(normalizedEmail);
};

export const getCredentialLoginLockoutState = async (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return {
      locked: false,
      remainingMs: 0,
      failedCount: 0
    };
  }

  const record = await findCredentialLoginAttemptByEmail(normalizedEmail);
  if (!record) {
    return {
      locked: false,
      remainingMs: 0,
      failedCount: 0
    };
  }

  const now = Date.now();
  const lockUntilMs = Date.parse(record.lockUntilAt || "") || 0;
  const firstFailedAtMs = Date.parse(record.firstFailedAt || "") || 0;
  const failedCount = Math.max(0, Number(record.failedCount || 0));

  if (lockUntilMs > now) {
    return {
      locked: true,
      remainingMs: lockUntilMs - now,
      failedCount
    };
  }

  const lockoutWindowMs = resolveLockoutWindowMs();
  if (
    lockUntilMs > 0 ||
    (firstFailedAtMs > 0 && now - firstFailedAtMs >= lockoutWindowMs)
  ) {
    await clearCredentialLoginLockout(normalizedEmail);
  }

  return {
    locked: false,
    remainingMs: 0,
    failedCount: 0
  };
};

export const assertCredentialLoginAllowed = async (email) => {
  const lockoutState = await getCredentialLoginLockoutState(email);
  if (lockoutState.locked) {
    throw createLockedError(lockoutState.remainingMs);
  }
  return lockoutState;
};

export const registerCredentialLoginFailure = async (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return {
      locked: false,
      remainingMs: 0,
      failedCount: 0
    };
  }

  const now = Date.now();
  const record = await findCredentialLoginAttemptByEmail(normalizedEmail);
  const previousFirstFailedAtMs = Date.parse(record?.firstFailedAt || "") || 0;
  const lockoutWindowMs = resolveLockoutWindowMs();
  const withinActiveWindow =
    previousFirstFailedAtMs > 0 && now - previousFirstFailedAtMs < lockoutWindowMs;
  const nextFailedCount = withinActiveWindow
    ? Math.max(0, Number(record?.failedCount || 0)) + 1
    : 1;
  const lockUntilAt =
    nextFailedCount >= resolveMaxFailedAttempts()
      ? new Date(now + lockoutWindowMs)
      : null;

  await upsertCredentialLoginAttemptByEmail({
    email: normalizedEmail,
    payload: {
      email: normalizedEmail,
      failedCount: nextFailedCount,
      firstFailedAt: withinActiveWindow ? new Date(previousFirstFailedAtMs) : new Date(now),
      lastFailedAt: new Date(now),
      lockUntilAt
    }
  });

  return {
    locked: Boolean(lockUntilAt),
    remainingMs: lockUntilAt ? lockUntilAt.getTime() - now : 0,
    failedCount: nextFailedCount
  };
};
