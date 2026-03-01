import {
  getMeByUid,
  getUserById,
  syncUserFromAuth
} from "../services/users.service.js";

export const syncFromAuth = async (req, res, next) => {
  try {
    const { uid, email, displayName } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ message: "uid and email are required" });
    }

    const user = await syncUserFromAuth({ uid, email, displayName });
    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const uid = req.headers["x-user-id"] || req.query.uid;
    if (!uid) {
      return res.status(400).json({ message: "x-user-id header is required" });
    }

    const user = await getMeByUid(uid.toString());
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
};
