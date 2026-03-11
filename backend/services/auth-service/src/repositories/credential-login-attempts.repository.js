import { CredentialLoginAttempt } from "../models/CredentialLoginAttempt.model.js";

export const findCredentialLoginAttemptByEmail = async (email) =>
  CredentialLoginAttempt.findOne({
    email: String(email || "").trim().toLowerCase()
  });

export const upsertCredentialLoginAttemptByEmail = async ({
  email,
  payload
}) =>
  CredentialLoginAttempt.findOneAndUpdate(
    {
      email: String(email || "").trim().toLowerCase()
    },
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

export const deleteCredentialLoginAttemptByEmail = async (email) =>
  CredentialLoginAttempt.findOneAndDelete({
    email: String(email || "").trim().toLowerCase()
  });
