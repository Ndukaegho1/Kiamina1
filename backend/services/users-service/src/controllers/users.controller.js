import {
  deleteUser,
  getMeByUid,
  getUserById,
  syncUserFromAuth,
  updateUser
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

export const putById = async (req, res, next) => {
  try {
    const { email, displayName, roles, status } = req.body;
    const payload = {};

    if (email !== undefined) {
      payload.email = String(email).toLowerCase().trim();
    }
    if (displayName !== undefined) {
      payload.displayName = displayName;
    }
    if (roles !== undefined) {
      payload.roles = roles;
    }
    if (status !== undefined) {
      payload.status = status;
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        message: "Provide at least one field: email, displayName, roles, status"
      });
    }

    const updated = await updateUser({
      id: req.params.id,
      payload
    });

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
};

export const removeById = async (req, res, next) => {
  try {
    const deleted = await deleteUser(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User deleted successfully.",
      id: deleted.id
    });
  } catch (error) {
    return next(error);
  }
};
