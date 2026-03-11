import { AuthSession } from "../models/AuthSession.model.js";

export const createAuthSession = async (payload) => AuthSession.create(payload);

export const findAuthSessionBySessionId = async (sessionId) =>
  AuthSession.findOne({
    sessionId
  });

export const findActiveAuthSessionBySessionId = async (sessionId) =>
  AuthSession.findOne({
    sessionId,
    revokedAt: null,
    expiresAt: {
      $gt: new Date()
    }
  });

export const updateAuthSessionBySessionId = async (sessionId, payload) =>
  AuthSession.findOneAndUpdate(
    { sessionId },
    {
      $set: payload
    },
    {
      new: true,
      runValidators: true
    }
  );

export const revokeAuthSession = async ({ sessionId, reason = "revoked" }) =>
  AuthSession.findOneAndUpdate(
    { sessionId, revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
        revokedReason: reason
      }
    },
    {
      new: true
    }
  );

export const revokeAuthSessionsByUid = async ({ uid, reason = "revoked" }) =>
  AuthSession.updateMany(
    { uid, revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
        revokedReason: reason
      }
    }
  );
