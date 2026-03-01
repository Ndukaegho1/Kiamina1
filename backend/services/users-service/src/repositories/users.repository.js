import { User } from "../models/User.model.js";

export const upsertUserFromAuth = async ({ uid, email, displayName }) =>
  User.findOneAndUpdate(
    { uid },
    {
      $set: {
        email: email.toLowerCase(),
        displayName: displayName || ""
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

export const findUserByUid = async (uid) => User.findOne({ uid });

export const findUserById = async (id) => User.findById(id);

export const updateUserById = async (id, payload) =>
  User.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true
  });

export const deleteUserById = async (id) => User.findByIdAndDelete(id);
