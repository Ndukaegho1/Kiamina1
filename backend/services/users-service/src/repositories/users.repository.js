import { User } from "../models/User.model.js";

export const upsertUserFromAuth = async ({ uid, email, displayName, roles }) => {
  const updatePayload = {
    email: email.toLowerCase(),
    displayName: displayName || ""
  };

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

export const findUserById = async (id) => User.findById(id);

export const updateUserById = async (id, payload) =>
  User.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true
  });

export const deleteUserById = async (id) => User.findByIdAndDelete(id);
