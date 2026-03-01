import {
  findUserById,
  findUserByUid,
  upsertUserFromAuth
} from "../repositories/users.repository.js";

export const syncUserFromAuth = async ({ uid, email, displayName }) =>
  upsertUserFromAuth({ uid, email, displayName });

export const getMeByUid = async (uid) => findUserByUid(uid);

export const getUserById = async (id) => findUserById(id);
