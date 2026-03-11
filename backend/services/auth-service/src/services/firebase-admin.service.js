import fs from "node:fs";
import path from "node:path";
import admin from "firebase-admin";
import { env } from "../config/env.js";

let initialized = false;
let initializationFailed = false;

const resolveCredentialsPath = () => {
  if (!env.googleApplicationCredentials) {
    return "";
  }

  return path.isAbsolute(env.googleApplicationCredentials)
    ? env.googleApplicationCredentials
    : path.resolve(process.cwd(), env.googleApplicationCredentials);
};

const initializeFirebaseAdmin = () => {
  if (initialized || initializationFailed) {
    return initialized;
  }

  try {
    const credentialsPath = resolveCredentialsPath();

    if (credentialsPath && fs.existsSync(credentialsPath)) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
      admin.initializeApp();
      initialized = true;
      return true;
    }

    if (env.firebaseServiceAccountJson) {
      const serviceAccount = JSON.parse(env.firebaseServiceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      initialized = true;
      return true;
    }

    if (credentialsPath && !fs.existsSync(credentialsPath)) {
      throw new Error(
        `GOOGLE_APPLICATION_CREDENTIALS file not found: ${credentialsPath}`
      );
    }

    initializationFailed = true;
    return false;
  } catch (error) {
    initializationFailed = true;
    console.error("Firebase Admin initialization failed:", error.message);
    return false;
  }
};

export const verifyFirebaseIdToken = async (idToken) => {
  const isReady = initializeFirebaseAdmin();
  if (!isReady) {
    return null;
  }

  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    console.error("Firebase token verification failed:", error.message);
    return null;
  }
};

export const deleteFirebaseUserByUid = async (uid) => {
  const normalizedUid = String(uid || "").trim();
  if (!normalizedUid) {
    return {
      attempted: false,
      deleted: false,
      skipped: true,
      reason: "missing-uid"
    };
  }

  const isReady = initializeFirebaseAdmin();
  if (!isReady) {
    return {
      attempted: false,
      deleted: false,
      skipped: true,
      reason: "firebase-admin-unavailable"
    };
  }

  try {
    await admin.auth().deleteUser(normalizedUid);
    return {
      attempted: true,
      deleted: true,
      skipped: false,
      reason: ""
    };
  } catch (error) {
    if (error?.code === "auth/user-not-found") {
      return {
        attempted: true,
        deleted: false,
        skipped: false,
        reason: "firebase-user-not-found"
      };
    }

    console.error("Firebase user deletion failed:", error.message);
    return {
      attempted: true,
      deleted: false,
      skipped: false,
      reason: String(error?.message || "firebase-user-delete-failed")
    };
  }
};

export const generateFirebasePasswordResetLink = async (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return {
      ok: false,
      link: "",
      reason: "missing-email"
    };
  }

  const isReady = initializeFirebaseAdmin();
  if (!isReady) {
    return {
      ok: false,
      link: "",
      reason: "firebase-admin-unavailable"
    };
  }

  try {
    const link = await admin.auth().generatePasswordResetLink(normalizedEmail);
    return {
      ok: true,
      link: String(link || "").trim(),
      reason: ""
    };
  } catch (error) {
    return {
      ok: false,
      link: "",
      reason: String(error?.message || "password-reset-link-generation-failed")
    };
  }
};

export const generateFirebaseEmailVerificationLink = async (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return {
      ok: false,
      link: "",
      reason: "missing-email"
    };
  }

  const isReady = initializeFirebaseAdmin();
  if (!isReady) {
    return {
      ok: false,
      link: "",
      reason: "firebase-admin-unavailable"
    };
  }

  try {
    const link = await admin.auth().generateEmailVerificationLink(normalizedEmail);
    return {
      ok: true,
      link: String(link || "").trim(),
      reason: ""
    };
  } catch (error) {
    return {
      ok: false,
      link: "",
      reason: String(error?.message || "email-verification-link-generation-failed")
    };
  }
};

export const updateFirebaseUserPassword = async ({
  uid,
  newPassword
}) => {
  const normalizedUid = String(uid || "").trim();
  const normalizedPassword = String(newPassword || "");
  if (!normalizedUid || !normalizedPassword) {
    return {
      ok: false,
      reason: "missing-uid-or-password"
    };
  }

  const isReady = initializeFirebaseAdmin();
  if (!isReady) {
    return {
      ok: false,
      reason: "firebase-admin-unavailable"
    };
  }

  try {
    await admin.auth().updateUser(normalizedUid, {
      password: normalizedPassword
    });
    return {
      ok: true,
      reason: ""
    };
  } catch (error) {
    return {
      ok: false,
      reason: String(error?.message || "password-update-failed")
    };
  }
};
