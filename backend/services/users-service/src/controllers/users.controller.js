import {
  deleteUser,
  getMeByUid,
  getUserById,
  syncUserFromAuth,
  updateUser
} from "../services/users.service.js";
import { getRequestActor, isAdminActor } from "../utils/request-actor.js";
import {
  buildUserUpdatePayload,
  validateSyncFromAuthPayload
} from "../validation/users.validation.js";

export const syncFromAuth = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    if (!actor.uid) {
      return res
        .status(401)
        .json({ message: "Missing x-user-id header from authenticated gateway request" });
    }

    const { errors, payload } = validateSyncFromAuthPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const actorIsAdmin = isAdminActor(actor);
    if (!actorIsAdmin && payload.uid !== actor.uid) {
      return res
        .status(403)
        .json({ message: "You can only sync your own account." });
    }

    const roles = actorIsAdmin ? payload.roles || actor.roles : actor.roles;

    const user = await syncUserFromAuth({
      uid: payload.uid,
      email: payload.email,
      displayName: payload.displayName,
      roles: roles.length > 0 ? roles : undefined
    });

    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    if (!actor.uid) {
      return res
        .status(401)
        .json({ message: "Missing x-user-id header from authenticated gateway request" });
    }

    const user = await getMeByUid(actor.uid);
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
    const actor = getRequestActor(req);
    if (!actor.uid) {
      return res
        .status(401)
        .json({ message: "Missing x-user-id header from authenticated gateway request" });
    }

    const user = await getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const actorIsAdmin = isAdminActor(actor);
    if (!actorIsAdmin && user.uid !== actor.uid) {
      return res.status(403).json({ message: "You cannot view another user's profile." });
    }

    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
};

export const putById = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    if (!actor.uid) {
      return res
        .status(401)
        .json({ message: "Missing x-user-id header from authenticated gateway request" });
    }

    const targetUser = await getUserById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const actorIsAdmin = isAdminActor(actor);
    if (!actorIsAdmin && targetUser.uid !== actor.uid) {
      return res.status(403).json({ message: "You cannot update another user's profile." });
    }

    const { payload, errors } = buildUserUpdatePayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        message: "Provide at least one field: email, displayName, roles, status"
      });
    }

    if (
      !actorIsAdmin &&
      (payload.email !== undefined || payload.roles !== undefined || payload.status !== undefined)
    ) {
      return res.status(403).json({
        message: "Only admin users can update email, roles, or status."
      });
    }

    const updated = await updateUser({
      id: req.params.id,
      payload
    });

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
};

export const removeById = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    if (!actor.uid) {
      return res
        .status(401)
        .json({ message: "Missing x-user-id header from authenticated gateway request" });
    }

    if (!isAdminActor(actor)) {
      return res.status(403).json({ message: "Only admin users can delete accounts." });
    }

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
