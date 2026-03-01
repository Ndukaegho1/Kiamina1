import admin from "firebase-admin";
import { env } from "../config/env.js";

let initialized = false;
let initializationFailed = false;

const initializeFirebaseAdmin = () => {
  if (initialized || initializationFailed) {
    return initialized;
  }

  try {
    if (env.firebaseServiceAccountJson) {
      const serviceAccount = JSON.parse(env.firebaseServiceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      initialized = true;
      return true;
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp();
      initialized = true;
      return true;
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
