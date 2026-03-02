import { User } from "../models/User.model.js";

export const upsertUserFromAuth = async ({ uid, email, displayName, roles }) => {
  const updatePayload = {
    email: email.toLowerCase()
  };

  const normalizedDisplayName = String(displayName ?? "").trim();
  if (normalizedDisplayName) {
    updatePayload.displayName = normalizedDisplayName;
  }

  if (Array.isArray(roles) && roles.length > 0) {
    updatePayload.roles = roles;
  }

  return User.findOneAndUpdate(
    { uid },
    {
      $set: updatePayload
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );
};

export const findUserByUid = async (uid) => User.findOne({ uid });

export const findUserByEmail = async (email) =>
  User.findOne({ email: String(email || "").trim().toLowerCase() });

export const findUserById = async (id) => User.findById(id);

export const updateUserById = async (id, payload) =>
  User.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true
  });

export const updateUserByUid = async (uid, payload) =>
  User.findOneAndUpdate({ uid }, payload, {
    new: true,
    runValidators: true
  });

export const deleteUserById = async (id) => User.findByIdAndDelete(id);
