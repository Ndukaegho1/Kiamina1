import {
  deleteUser,
  deleteUserForUid,
  ensureUserFromActor,
  getClientPhoneAvailability,
  getClientManagementClientByUidForAdmin,
  listClientManagementClientsForAdmin,
  listAdminStaffForAdmin,
  getAdminDashboardByUid,
  getClientDashboardByUid,
  getClientDashboardOverviewByUid,
  getClientWorkspaceByUid,
  getMeByUid,
  getUserById,
  upsertPublicNewsletterSubscription,
  upsertPublicSupportLead,
  updateAdminStaffByUid,
  updateAdminDashboardByUid,
  updateClientManagementClientByUidForAdmin,
  updateClientDashboardByUid,
  updateClientProfileByUid,
  updateClientWorkspaceByUid,
  syncUserFromAuth,
  updateUser
} from "../services/users.service.js";
import {
  getRequestActor,
  isAdminActor,
  isElevatedAdminActor
} from "../utils/request-actor.js";
import {
  buildAdminClientManagementUpdatePayload,
  buildAdminDashboardUpdatePayload,
  buildAdminStaffUpdatePayload,
  buildClientDashboardUpdatePayload,
  buildClientProfileUpdatePayload,
  buildClientWorkspaceUpdatePayload,
  buildPublicNewsletterPayload,
  buildPublicSupportLeadPayload,
  buildUserUpdatePayload,
  validateAdminClientManagementListQuery,
  validateSyncFromAuthPayload
} from "../validation/users.validation.js";

const resolveRequestIpAddress = (req) => {
  const forwardedHeader = String(req.headers["x-forwarded-for"] || "").trim();
  if (forwardedHeader) {
    const [first] = forwardedHeader
      .split(",")
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    if (first) return first;
  }

  return String(req.ip || req.socket?.remoteAddress || "").trim();
};

const resolveAccountDeletionReason = (source, fallback = "account-deleted") => {
  const payload = source && typeof source === "object" ? source : {};
  const rawReason =
    payload.reason ||
    payload.retentionIntent ||
    payload.reasonOther ||
    fallback;
  const normalized = String(rawReason || "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return normalized.slice(0, 120);
};

export const getPublicPhoneAvailability = async (req, res, next) => {
  try {
    const phoneNumber = String(req.query?.phoneNumber || req.query?.phone || "").trim();
    const result = await getClientPhoneAvailability({ phoneNumber });
    return res.status(result.available ? 200 : 409).json(result);
  } catch (error) {
    return next(error);
  }
};

export const postPublicSupportLead = async (req, res, next) => {
  try {
    const { errors, payload } = buildPublicSupportLeadPayload(req.body);
    if (errors.length > 0 || !payload) {
      return res.status(400).json({ message: errors.join("; ") || "Invalid support lead payload" });
    }

    const result = await upsertPublicSupportLead({
      payload: {
        ...payload,
        leadIpAddress: String(payload.leadIpAddress || resolveRequestIpAddress(req)).trim()
      }
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export const postPublicNewsletter = async (req, res, next) => {
  try {
    const { errors, payload } = buildPublicNewsletterPayload(req.body);
    if (errors.length > 0 || !payload) {
      return res.status(400).json({ message: errors.join("; ") || "Invalid newsletter payload" });
    }

    const result = await upsertPublicNewsletterSubscription({
      payload: {
        ...payload,
        leadIpAddress: String(payload.leadIpAddress || resolveRequestIpAddress(req)).trim()
      }
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

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
      roles: roles.length > 0 ? roles : undefined,
      signupCapture: payload.signupCapture
        ? {
            ...payload.signupCapture,
            signupIp: String(payload.signupCapture.signupIp || resolveRequestIpAddress(req)).trim()
          }
        : undefined
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

    const user =
      (await getMeByUid(actor.uid)) ||
      (await ensureUserFromActor({
        uid: actor.uid,
        email: actor.email,
        roles: actor.roles,
        displayName: ""
      }));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
};

export const removeMe = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    if (!actor.uid) {
      return res
        .status(401)
        .json({ message: "Missing x-user-id header from authenticated gateway request" });
    }

    const reason = resolveAccountDeletionReason(req.body, "account-deleted");
    const deleted = await deleteUserForUid({
      uid: actor.uid,
      actorUid: actor.uid,
      actorEmail: actor.email,
      actorRoles: actor.roles,
      reason
    });
    if (!deleted?.user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User deleted successfully.",
      uid: actor.uid,
      cascade: deleted.cascade || {}
    });
  } catch (error) {
    return next(error);
  }
};

export const patchMeProfile = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    if (!actor.uid) {
      return res
        .status(401)
        .json({ message: "Missing x-user-id header from authenticated gateway request" });
    }

    const { payload, errors } = buildClientProfileUpdatePayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const hasSignupCaptureUpdate = Object.keys(payload).some((key) => key.startsWith("signupCapture."));
    if (hasSignupCaptureUpdate && !String(payload["signupCapture.signupIp"] || "").trim()) {
      payload["signupCapture.signupIp"] = resolveRequestIpAddress(req);
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        message:
          "Provide at least one profile field: firstName, lastName, otherNames, phone, businessType, businessName, country, currency, reportingCycle, startMonth, address fields, or signup capture fields"
      });
    }

    const updated = await updateClientProfileByUid({
      uid: actor.uid,
      actorUid: actor.uid,
      actorEmail: actor.email,
      actorRoles: actor.roles,
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

export const getMeClientDashboard = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    if (!actor.uid) {
      return res
        .status(401)
        .json({ message: "Missing x-user-id header from authenticated gateway request" });
    }

    const dashboard = await getClientDashboardByUid({
      uid: actor.uid,
      actorEmail: actor.email,
      actorRoles: actor.roles
    });
    if (!dashboard) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(dashboard);
  } catch (error) {
    return next(error);
  }
};

export const patchMeClientDashboard = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    if (!actor.uid) {
      return res
        .status(401)
        .json({ message: "Missing x-user-id header from authenticated gateway request" });
    }

    const { payload, errors } = buildClientDashboardUpdatePayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        message:
          "Provide at least one dashboard field: defaultLandingPage, lastVisitedPage, showGreeting, compactMode, widgets, favoritePages, notificationPreferences"
      });
    }

    const dashboard = await updateClientDashboardByUid({
      uid: actor.uid,
      actorUid: actor.uid,
      actorEmail: actor.email,
      actorRoles: actor.roles,
      payload
    });

    if (!dashboard) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(dashboard);
  } catch (error) {
    return next(error);
  }
};

export const getMeClientDashboardOverview = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    if (!actor.uid) {
      return res
        .status(401)
        .json({ message: "Missing x-user-id header from authenticated gateway request" });
    }

    const overview = await getClientDashboardOverviewByUid({
      uid: actor.uid,
      actorEmail: actor.email,
      actorRoles: actor.roles
    });

    if (!overview) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(overview);
  } catch (error) {
    return next(error);
  }
};

export const getMeClientWorkspace = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    if (!actor.uid) {
      return res
        .status(401)
        .json({ message: "Missing x-user-id header from authenticated gateway request" });
    }

    const workspace = await getClientWorkspaceByUid({
      uid: actor.uid,
      actorEmail: actor.email,
      actorRoles: actor.roles
    });

    if (!workspace) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(workspace);
  } catch (error) {
    return next(error);
  }
};

export const patchMeClientWorkspace = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    if (!actor.uid) {
      return res
        .status(401)
        .json({ message: "Missing x-user-id header from authenticated gateway request" });
    }

    const { payload, errors } = buildClientWorkspaceUpdatePayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        message:
          "Provide at least one workspace field: documents, activityLog, onboardingState, settingsProfile, verificationDocs, statusControl, notificationSettings, notifications, profilePhoto, companyLogo"
      });
    }

    const workspace = await updateClientWorkspaceByUid({
      uid: actor.uid,
      actorUid: actor.uid,
      actorEmail: actor.email,
      actorRoles: actor.roles,
      payload
    });

    if (!workspace) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(workspace);
  } catch (error) {
    return next(error);
  }
};

export const getAdminClientManagement = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    if (!actor.uid) {
      return res
        .status(401)
        .json({ message: "Missing x-user-id header from authenticated gateway request" });
    }

    if (!isAdminActor(actor)) {
      return res.status(403).json({ message: "Only admin users can access client management." });
    }

    const { errors, payload } = validateAdminClientManagementListQuery(req.query);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const result = await listClientManagementClientsForAdmin({
      query: payload
    });

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export const getAdminClientManagementClient = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    if (!actor.uid) {
      return res
        .status(401)
        .json({ message: "Missing x-user-id header from authenticated gateway request" });
    }

    if (!isAdminActor(actor)) {
      return res.status(403).json({ message: "Only admin users can access client management." });
    }

    const client = await getClientManagementClientByUidForAdmin({
      uid: String(req.params.uid || "").trim()
    });

    if (!client) {
      return res.status(404).json({ message: "Client account not found" });
    }

    return res.status(200).json(client);
  } catch (error) {
    return next(error);
  }
};

export const patchAdminClientManagementClient = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    if (!actor.uid) {
      return res
        .status(401)
        .json({ message: "Missing x-user-id header from authenticated gateway request" });
    }

    if (!isAdminActor(actor)) {
      return res.status(403).json({ message: "Only admin users can update client management." });
    }

    const { payload, errors } = buildAdminClientManagementUpdatePayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        message:
          "Provide at least one field to update: status, roles, verificationStatus, verificationPending, businessType, businessName, country, currency, assignedToUid, assignmentNotes, statusReason, tags, documents, notifications, activityLog"
      });
    }

    const updated = await updateClientManagementClientByUidForAdmin({
      uid: String(req.params.uid || "").trim(),
      actorUid: actor.uid,
      actorEmail: actor.email,
      actorRoles: actor.roles,
      payload
    });

    if (!updated) {
      return res.status(404).json({ message: "Client account not found" });
    }

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
};

export const deleteAdminClientManagementClient = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    if (!actor.uid) {
      return res
        .status(401)
        .json({ message: "Missing x-user-id header from authenticated gateway request" });
    }

    if (!isAdminActor(actor)) {
      return res.status(403).json({ message: "Only admin users can delete client accounts." });
    }
    if (!isElevatedAdminActor(actor)) {
      return res.status(403).json({ message: "Only owner or superadmin users can delete client accounts." });
    }

    const uid = String(req.params.uid || "").trim();
    if (!uid) {
      return res.status(400).json({ message: "uid is required." });
    }

    const reason = resolveAccountDeletionReason(req.body, "admin-client-account-deleted");
    const deleted = await deleteUserForUid({
      uid,
      actorUid: actor.uid,
      actorEmail: actor.email,
      actorRoles: actor.roles,
      reason
    });
    if (!deleted?.user) {
      return res.status(404).json({ message: "Client account not found" });
    }

    return res.status(200).json({
      message: "Client account deleted successfully.",
      uid: deleted.user.uid,
      cascade: deleted.cascade || {}
    });
  } catch (error) {
    return next(error);
  }
};

export const getMeAdminDashboard = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    if (!actor.uid) {
      return res
        .status(401)
        .json({ message: "Missing x-user-id header from authenticated gateway request" });
    }

    if (!isAdminActor(actor)) {
      return res.status(403).json({ message: "Only admin users can access admin dashboard." });
    }

    const dashboard = await getAdminDashboardByUid({
      uid: actor.uid,
      actorEmail: actor.email,
      actorRoles: actor.roles
    });

    if (!dashboard) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(dashboard);
  } catch (error) {
    return next(error);
  }
};

export const getAdminStaff = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    if (!actor.uid) {
      return res
        .status(401)
        .json({ message: "Missing x-user-id header from authenticated gateway request" });
    }

    if (!isAdminActor(actor)) {
      return res.status(403).json({ message: "Only admin users can access admin staff." });
    }

    const payload = await listAdminStaffForAdmin();
    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
};

export const patchMeAdminDashboard = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    if (!actor.uid) {
      return res
        .status(401)
        .json({ message: "Missing x-user-id header from authenticated gateway request" });
    }

    if (!isAdminActor(actor)) {
      return res.status(403).json({ message: "Only admin users can update admin dashboard." });
    }

    const { payload, errors } = buildAdminDashboardUpdatePayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        message:
          "Provide at least one admin dashboard field: defaultLandingPage, lastVisitedPage, compactMode, widgets, favoritePages, securityPreferences, adminProfile, supportLeads, newsletters"
      });
    }

    const dashboard = await updateAdminDashboardByUid({
      uid: actor.uid,
      actorUid: actor.uid,
      actorEmail: actor.email,
      actorRoles: actor.roles,
      payload
    });

    if (!dashboard) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(dashboard);
  } catch (error) {
    return next(error);
  }
};

export const patchAdminStaffByUid = async (req, res, next) => {
  try {
    const actor = getRequestActor(req);
    if (!actor.uid) {
      return res
        .status(401)
        .json({ message: "Missing x-user-id header from authenticated gateway request" });
    }

    if (!isElevatedAdminActor(actor)) {
      return res.status(403).json({ message: "Only owner or superadmin users can update admin staff." });
    }

    const { payload, errors } = buildAdminStaffUpdatePayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        message: "Provide at least one field: status, adminProfile, adminAccess"
      });
    }

    const updated = await updateAdminStaffByUid({
      uid: String(req.params.uid || "").trim(),
      actorUid: actor.uid,
      actorEmail: actor.email,
      actorRoles: actor.roles,
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
    if (!isElevatedAdminActor(actor)) {
      return res.status(403).json({ message: "Only owner or superadmin users can delete other accounts." });
    }

    const reason = resolveAccountDeletionReason(req.body, "admin-account-deleted");
    const deleted = await deleteUser({
      id: req.params.id,
      actorUid: actor.uid,
      actorEmail: actor.email,
      actorRoles: actor.roles,
      reason
    });
    if (!deleted?.user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User deleted successfully.",
      id: deleted.user.id,
      uid: deleted.user.uid,
      cascade: deleted.cascade || {}
    });
  } catch (error) {
    return next(error);
  }
};
