import { AuthSession } from "../models/AuthSession.model.js";

export const createAuthSession = async (payload) => AuthSession.create(payload);

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
