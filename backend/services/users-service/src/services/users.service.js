import {
  deleteUserById,
  findUserById,
  findUserByUid,
  updateUserById,
  upsertUserFromAuth
} from "../repositories/users.repository.js";

export const syncUserFromAuth = async ({ uid, email, displayName, roles }) =>
  upsertUserFromAuth({ uid, email, displayName, roles });

export const getMeByUid = async (uid) => findUserByUid(uid);

export const getUserById = async (id) => findUserById(id);

export const updateUser = async ({ id, payload }) => updateUserById(id, payload);

export const deleteUser = async (id) => deleteUserById(id);
