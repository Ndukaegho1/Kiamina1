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
