import fs from "node:fs";
import path from "node:path";
import admin from "firebase-admin";
import { env } from "../config/env.js";
import { createServiceUnavailableError } from "../utils/errors.js";

const APP_NAME = "documents-service";
let initialized = false;
let initError = "";

const resolveCredentialsPath = () => {
  if (!env.googleApplicationCredentials) {
    return "";
  }

  return path.isAbsolute(env.googleApplicationCredentials)
    ? env.googleApplicationCredentials
    : path.resolve(process.cwd(), env.googleApplicationCredentials);
};

const initializeFirebaseApp = () => {
  if (initialized) {
    return true;
  }

  if (initError) {
    return false;
  }

  try {
    const existing = admin.apps.find((app) => app.name === APP_NAME);
    if (existing) {
      initialized = true;
      return true;
    }

    const credentialsPath = resolveCredentialsPath();
    const options = {};

    if (env.firebaseStorageBucket) {
      options.storageBucket = env.firebaseStorageBucket;
    }

    if (credentialsPath && fs.existsSync(credentialsPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
      options.credential = admin.credential.cert(serviceAccount);
      admin.initializeApp(options, APP_NAME);
      initialized = true;
      return true;
    }

    if (env.firebaseServiceAccountJson) {
      const serviceAccount = JSON.parse(env.firebaseServiceAccountJson);
      options.credential = admin.credential.cert(serviceAccount);
      admin.initializeApp(options, APP_NAME);
      initialized = true;
      return true;
    }

    if (credentialsPath && !fs.existsSync(credentialsPath)) {
      throw new Error(
        `GOOGLE_APPLICATION_CREDENTIALS file not found: ${credentialsPath}`
      );
    }

    initError = "Firebase service account credentials are not configured.";
    return false;
  } catch (error) {
    initError = error.message;
    console.error("documents-service firebase init failed:", error.message);
    return false;
  }
};

const getFirebaseApp = () => admin.app(APP_NAME);

const assertStorageReady = () => {
  if (!initializeFirebaseApp()) {
    throw createServiceUnavailableError(
      initError || "Firebase storage is not initialized"
    );
  }

  if (!env.firebaseStorageBucket) {
    throw createServiceUnavailableError(
      "FIREBASE_STORAGE_BUCKET is required for document uploads"
    );
  }

  return getFirebaseApp().storage().bucket(env.firebaseStorageBucket);
};

const sanitizeFileName = (value) =>
  String(value || "file")
    .replace(/[^\w.-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 160);

export const uploadFileBuffer = async ({
  ownerUserId,
  originalName,
  mimeType,
  buffer
}) => {
  const bucket = assertStorageReady();
  const timestamp = Date.now();
  const safeName = sanitizeFileName(originalName);
  const storagePath = `documents/${ownerUserId}/${timestamp}-${safeName}`;
  const file = bucket.file(storagePath);

  await file.save(buffer, {
    resumable: false,
    contentType: mimeType || "application/octet-stream",
    metadata: {
      cacheControl: "private, max-age=0, no-cache"
    }
  });

  return {
    storageProvider: "firebase",
    storagePath,
    size: buffer.length,
    contentType: mimeType || "application/octet-stream"
  };
};

export const createSignedDownloadUrl = async ({ storagePath, fileName }) => {
  const bucket = assertStorageReady();
  const file = bucket.file(storagePath);
  const expiresAt =
    Date.now() + Math.max(1, env.signedUrlExpiresMinutes) * 60 * 1000;

  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: expiresAt,
    responseDisposition: `attachment; filename="${sanitizeFileName(fileName)}"`
  });

  return {
    url,
    expiresAt: new Date(expiresAt).toISOString()
  };
};

export const deleteStorageObject = async (storagePath) => {
  const bucket = assertStorageReady();
  const file = bucket.file(storagePath);

  try {
    await file.delete({ ignoreNotFound: true });
    return true;
  } catch (error) {
    console.error("documents-service storage delete failed:", error.message);
    return false;
  }
};
