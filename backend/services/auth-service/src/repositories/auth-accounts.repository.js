import { AuthAccount } from "../models/AuthAccount.model.js";

export const findAuthAccountByUid = async (uid) => AuthAccount.findOne({ uid });

export const findAuthAccountByEmail = async (email) =>
  AuthAccount.findOne({ email: String(email || "").trim().toLowerCase() });

export const upsertAuthAccountByUid = async ({ uid, payload }) =>
  AuthAccount.findOneAndUpdate(
    { uid },
    {
      $set: payload
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true
    }
  );

export const updateAuthAccountLoginMeta = async ({
  uid,
  lastLoginAt,
  lastLoginIp,
  lastLoginUserAgent,
  lastLoginMethod
}) =>
  AuthAccount.findOneAndUpdate(
    { uid },
    {
      $set: {
        lastLoginAt,
        lastLoginIp,
        lastLoginUserAgent,
        lastLoginMethod
      }
    },
    {
      new: true,
      runValidators: true
    }
  );
