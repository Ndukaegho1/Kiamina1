import {
  countUsers,
  deleteUserById,
  findUserByEmail,
  findUserById,
  findUserByUid,
  listUsers,
  updateUserByUid,
  updateUserById,
  upsertUserFromAuth
} from "../repositories/users.repository.js";
import { env } from "../config/env.js";
import { publishUsersRealtimeEvent } from "./realtime-events.service.js";

const ADMIN_EVENT_ROLES = ["admin", "owner", "superadmin"];
const CLIENT_ROLE = "client";
const CLIENT_MANAGEMENT_SORT_FIELDS = Object.freeze({
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  email: "email",
  displayName: "displayName",
  businessName: "entityProfile.businessName",
  status: "status",
  verificationStatus: "verification.status"
});

export const syncUserFromAuth = async ({ uid, email, displayName, roles }) =>
  upsertUserFromAuth({ uid, email, displayName, roles });

export const getMeByUid = async (uid) => findUserByUid(uid);

export const getUserById = async (id) => findUserById(id);

export const updateUser = async ({ id, payload }) => updateUserById(id, payload);

export const deleteUser = async (id) => deleteUserById(id);

const toTitleCaseWords = (value = "") =>
  String(value || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const joinFullName = ({ firstName = "", otherNames = "", lastName = "" }) =>
  [firstName, otherNames, lastName].filter(Boolean).join(" ").trim();

const deriveProfileStepCompleted = ({
  firstName = "",
  lastName = "",
  email = "",
  businessType = "",
  businessName = "",
  country = ""
}) => Boolean(firstName && lastName && email && businessType && businessName && country);

const deriveVerificationSnapshot = ({ currentVerification = {}, profileStepCompleted = false }) => {
  const identityStepCompleted = Boolean(currentVerification?.identityStepCompleted);
  const businessStepCompleted = Boolean(currentVerification?.businessStepCompleted);
  const stepsCompleted =
    Number(profileStepCompleted) + Number(identityStepCompleted) + Number(businessStepCompleted);

  const existingStatus = String(currentVerification?.status || "pending").trim().toLowerCase();
  const status =
    existingStatus === "suspended" || existingStatus === "rejected"
      ? existingStatus
      : stepsCompleted >= 3
        ? "verified"
        : existingStatus === "submitted"
          ? "submitted"
          : "pending";

  return {
    status,
    profileStepCompleted,
    stepsCompleted,
    fullyVerifiedAt: stepsCompleted >= 3 ? new Date() : null
  };
};

const toLowerRoles = (roles = []) =>
  (Array.isArray(roles) ? roles : [])
    .map((role) => String(role || "").trim().toLowerCase())
    .filter(Boolean);

const isClientUser = (user = {}) =>
  toLowerRoles(user.roles).includes(CLIENT_ROLE);

const normalizeSearchTerm = (value = "") => String(value || "").trim();
const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toPlainObject = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value.toObject === "function") {
    return value.toObject();
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return { ...value };
  }
  return fallback;
};

const buildClientWorkspacePayload = ({ user }) => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName || "",
  workspace: toPlainObject(user.clientWorkspace, {})
});

const buildClientManagementRow = ({ user }) => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName || "",
  status: user.status || "active",
  roles: Array.isArray(user.roles) ? user.roles : [],
  businessName: user.entityProfile?.businessName || "",
  country: user.entityProfile?.country || "",
  currency: user.entityProfile?.currency || "NGN",
  businessType: user.entityProfile?.businessType || "",
  verificationStatus: user.verification?.status || "pending",
  verificationStepsCompleted: Number(user.verification?.stepsCompleted || 0),
  onboardingCompleted: Boolean(user.onboarding?.completed),
  assignedToUid: String(user.clientWorkspace?.statusControl?.assignedToUid || "").trim(),
  createdAt: user.createdAt || null,
  updatedAt: user.updatedAt || null
});

const buildClientManagementDetail = ({ user }) => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName || "",
  status: user.status || "active",
  roles: Array.isArray(user.roles) ? user.roles : [],
  clientProfile: toPlainObject(user.clientProfile, {}),
  entityProfile: toPlainObject(user.entityProfile, {}),
  onboarding: toPlainObject(user.onboarding, {}),
  verification: toPlainObject(user.verification, {}),
  notificationPreferences: toPlainObject(user.notificationPreferences, {}),
  clientDashboard: toPlainObject(user.clientDashboard, {}),
  clientWorkspace: toPlainObject(user.clientWorkspace, {}),
  createdAt: user.createdAt || null,
  updatedAt: user.updatedAt || null
});

const buildClientManagementFilter = ({
  q = "",
  status = "",
  verificationStatus = "",
  onboardingCompleted
} = {}) => {
  const filter = {
    roles: { $in: [CLIENT_ROLE] }
  };

  if (status) {
    filter.status = status;
  }

  if (verificationStatus) {
    filter["verification.status"] = verificationStatus;
  }

  if (typeof onboardingCompleted === "boolean") {
    filter["onboarding.completed"] = onboardingCompleted;
  }

  const term = normalizeSearchTerm(q);
  if (term) {
    const regex = new RegExp(escapeRegex(term), "i");
    filter.$or = [
      { email: regex },
      { displayName: regex },
      { "clientProfile.fullName": regex },
      { "entityProfile.businessName": regex }
    ];
  }

  return filter;
};

const buildClientManagementSort = ({ sortBy = "updatedAt", sortOrder = "desc" } = {}) => {
  const resolvedSortField = CLIENT_MANAGEMENT_SORT_FIELDS[sortBy] || "updatedAt";
  const direction = sortOrder === "asc" ? 1 : -1;
  return { [resolvedSortField]: direction };
};

const buildClientManagementSummary = async () => {
  const baseFilter = { roles: { $in: [CLIENT_ROLE] } };
  const [totalClients, activeClients, disabledClients, suspendedClients, verifiedClients, onboardingCompleted] =
    await Promise.all([
      countUsers(baseFilter),
      countUsers({ ...baseFilter, status: "active" }),
      countUsers({ ...baseFilter, status: "disabled" }),
      countUsers({ ...baseFilter, status: "suspended" }),
      countUsers({ ...baseFilter, "verification.status": "verified" }),
      countUsers({ ...baseFilter, "onboarding.completed": true })
    ]);

  return {
    totalClients,
    activeClients,
    disabledClients,
    suspendedClients,
    verifiedClients,
    pendingVerificationClients: Math.max(0, totalClients - verifiedClients),
    onboardingCompletedClients: onboardingCompleted,
    onboardingPendingClients: Math.max(0, totalClients - onboardingCompleted)
  };
};

const emitUsersRealtimeEvent = async ({
  eventType,
  actorUid = "",
  actorEmail = "",
  actorRoles = [],
  audienceUserIds = [],
  audienceRoles = [],
  payload = {}
}) => {
  try {
    await publishUsersRealtimeEvent({
      eventType,
      actorUid,
      actorEmail,
      actorRoles,
      audienceUserIds,
      audienceRoles,
      payload
    });
  } catch (error) {
    console.error("users-service realtime emit warning:", error.message);
  }
};

const fetchDocumentSummaryByOwner = async ({ ownerUserId, actorEmail = "", actorRoles = [] }) => {
  if (!ownerUserId || !env.documentsServiceUrl) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, env.documentsServiceTimeoutMs);

  try {
    const response = await fetch(
      `${env.documentsServiceUrl}/api/v1/documents/owner/${encodeURIComponent(ownerUserId)}/summary`,
      {
        method: "GET",
        headers: {
          "x-user-id": String(ownerUserId),
          "x-user-email": String(actorEmail || ""),
          "x-user-roles": Array.isArray(actorRoles) ? actorRoles.join(",") : ""
        },
        signal: controller.signal
      }
    );

    if (!response.ok) {
      return null;
    }

    const payload = await response.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return null;
    }

    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      return null;
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const buildDashboardOverviewPayload = ({ user, documentSummary = null }) => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName || "",
  companyName: user.entityProfile?.businessName || "",
  businessCountry: user.entityProfile?.country || "",
  baseCurrency: user.entityProfile?.currency || "NGN",
  onboarding: toPlainObject(user.onboarding, {}),
  verification: toPlainObject(user.verification, {}),
  notificationPreferences: toPlainObject(user.notificationPreferences, {}),
  dashboard: toPlainObject(user.clientDashboard, {}),
  documentSummary: documentSummary
    ? {
        ownerUserId: String(documentSummary.ownerUserId || user.uid),
        totalDocuments: Number(documentSummary.totalDocuments || 0),
        pendingDocuments: Number(documentSummary.pendingDocuments || 0),
        approvedDocuments: Number(documentSummary.approvedDocuments || 0),
        rejectedDocuments: Number(documentSummary.rejectedDocuments || 0),
        uploadedLast7Days: Number(documentSummary.uploadedLast7Days || 0),
        lastUploadedAt: documentSummary.lastUploadedAt || null,
        statusCounts: {
          processing: Number(documentSummary.statusCounts?.processing || 0),
          toReview: Number(documentSummary.statusCounts?.toReview || 0),
          ready: Number(documentSummary.statusCounts?.ready || 0),
          rejected: Number(documentSummary.statusCounts?.rejected || 0),
          infoRequested: Number(documentSummary.statusCounts?.infoRequested || 0),
          other: Number(documentSummary.statusCounts?.other || 0)
        },
        categoryCounts: {
          expenses: Number(documentSummary.categoryCounts?.expenses || 0),
          sales: Number(documentSummary.categoryCounts?.sales || 0),
          bankStatements: Number(documentSummary.categoryCounts?.bankStatements || 0),
          other: Number(documentSummary.categoryCounts?.other || 0)
        },
        generatedAt: documentSummary.generatedAt || new Date().toISOString()
      }
    : {
        ownerUserId: user.uid,
        totalDocuments: 0,
        pendingDocuments: 0,
        approvedDocuments: 0,
        rejectedDocuments: 0,
        uploadedLast7Days: 0,
        lastUploadedAt: null,
        statusCounts: {
          processing: 0,
          toReview: 0,
          ready: 0,
          rejected: 0,
          infoRequested: 0,
          other: 0
        },
        categoryCounts: {
          expenses: 0,
          sales: 0,
          bankStatements: 0,
          other: 0
        },
        generatedAt: new Date().toISOString()
      }
});

const buildAdminDashboardPayload = ({ user }) => {
  const adminDashboard = toPlainObject(user.adminDashboard, {});
  const supportLeads = Array.isArray(adminDashboard.supportLeads)
    ? adminDashboard.supportLeads
    : [];
  const newsletters = Array.isArray(adminDashboard.newsletters)
    ? adminDashboard.newsletters
    : [];

  const openSupportLeads = supportLeads.filter(
    (lead) => lead?.status !== "closed" && lead?.status !== "converted"
  ).length;
  const newsletterSubscribers = newsletters.filter(
    (entry) => entry?.status === "subscribed"
  ).length;
  const newsletterUnsubscribed = newsletters.filter(
    (entry) => entry?.status === "unsubscribed"
  ).length;

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || "",
    roles: Array.isArray(user.roles) ? user.roles : [],
    adminProfile: toPlainObject(user.adminProfile, {}),
    dashboard: {
      ...adminDashboard,
      supportLeads,
      newsletters,
      stats: {
        openSupportLeads,
        newsletterSubscribers,
        newsletterUnsubscribed
      }
    }
  };
};

export const ensureUserFromActor = async ({ uid, email, roles = [], displayName = "" }) => {
  if (!uid) return null;

  const existingByUid = await findUserByUid(uid);
  if (existingByUid) return existingByUid;

  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;

  const existingByEmail = await findUserByEmail(normalizedEmail);
  const resolvedUid = existingByEmail?.uid || uid;

  return upsertUserFromAuth({
    uid: resolvedUid,
    email: normalizedEmail,
    displayName,
    roles
  });
};

export const updateClientProfileByUid = async ({
  uid,
  actorUid = "",
  actorEmail,
  actorRoles = [],
  payload
}) => {
  const existingUser = await ensureUserFromActor({
    uid,
    email: actorEmail,
    roles: actorRoles,
    displayName: ""
  });
  if (!existingUser) return null;

  const firstName =
    payload["clientProfile.firstName"] !== undefined
      ? payload["clientProfile.firstName"]
      : existingUser.clientProfile?.firstName || "";
  const lastName =
    payload["clientProfile.lastName"] !== undefined
      ? payload["clientProfile.lastName"]
      : existingUser.clientProfile?.lastName || "";
  const otherNames =
    payload["clientProfile.otherNames"] !== undefined
      ? payload["clientProfile.otherNames"]
      : existingUser.clientProfile?.otherNames || "";

  const normalizedFirstName = toTitleCaseWords(firstName);
  const normalizedLastName = toTitleCaseWords(lastName);
  const normalizedOtherNames = toTitleCaseWords(otherNames);
  const fullName = joinFullName({
    firstName: normalizedFirstName,
    otherNames: normalizedOtherNames,
    lastName: normalizedLastName
  });

  const phoneCountryCode =
    payload["clientProfile.phoneCountryCode"] !== undefined
      ? payload["clientProfile.phoneCountryCode"]
      : existingUser.clientProfile?.phoneCountryCode || "+234";
  const phoneLocalNumber =
    payload["clientProfile.phoneLocalNumber"] !== undefined
      ? payload["clientProfile.phoneLocalNumber"]
      : existingUser.clientProfile?.phoneLocalNumber || "";
  const composedPhone = phoneLocalNumber ? `${phoneCountryCode} ${phoneLocalNumber}`.trim() : "";

  const nextPayload = {
    ...payload,
    "clientProfile.firstName": normalizedFirstName,
    "clientProfile.lastName": normalizedLastName,
    "clientProfile.otherNames": normalizedOtherNames,
    "clientProfile.fullName": fullName,
    displayName: fullName || existingUser.displayName || "",
    "clientProfile.phoneCountryCode": phoneCountryCode,
    "clientProfile.phoneLocalNumber": phoneLocalNumber,
    "clientProfile.phone": composedPhone
  };

  const businessName =
    payload["entityProfile.businessName"] !== undefined
      ? payload["entityProfile.businessName"]
      : existingUser.entityProfile?.businessName || "";
  const businessCountry =
    payload["entityProfile.country"] !== undefined
      ? payload["entityProfile.country"]
      : existingUser.entityProfile?.country || "";
  const baseCurrency =
    payload["entityProfile.currency"] !== undefined
      ? payload["entityProfile.currency"]
      : existingUser.entityProfile?.currency || "NGN";
  const businessType =
    payload["entityProfile.businessType"] !== undefined
      ? payload["entityProfile.businessType"]
      : existingUser.entityProfile?.businessType || "";

  nextPayload["clientDashboard.lastVisitedAt"] = new Date();
  nextPayload["clientDashboard.companyName"] = businessName;
  nextPayload["clientDashboard.businessCountry"] = businessCountry;
  nextPayload["clientDashboard.baseCurrency"] = baseCurrency;

  const profileStepCompleted = deriveProfileStepCompleted({
    firstName: normalizedFirstName,
    lastName: normalizedLastName,
    email: existingUser.email || actorEmail || "",
    businessType,
    businessName,
    country: businessCountry
  });

  const verificationSnapshot = deriveVerificationSnapshot({
    currentVerification: existingUser.verification || {},
    profileStepCompleted
  });

  nextPayload["verification.profileStepCompleted"] = verificationSnapshot.profileStepCompleted;
  nextPayload["verification.stepsCompleted"] = verificationSnapshot.stepsCompleted;
  nextPayload["verification.status"] = verificationSnapshot.status;
  nextPayload["verification.fullyVerifiedAt"] = verificationSnapshot.fullyVerifiedAt;
  nextPayload["onboarding.verificationPending"] = verificationSnapshot.stepsCompleted < 3;

  const updatedUser = await updateUserByUid(uid, { $set: nextPayload });
  if (!updatedUser) return null;

  void emitUsersRealtimeEvent({
    eventType: "client.profile.updated",
    actorUid: actorUid || uid,
    actorEmail,
    actorRoles,
    audienceUserIds: [uid],
    audienceRoles: ADMIN_EVENT_ROLES,
    payload: {
      uid,
      displayName: updatedUser.displayName || "",
      verificationStatus: updatedUser.verification?.status || "pending"
    }
  });

  return updatedUser;
};

export const getClientDashboardByUid = async ({ uid, actorEmail, actorRoles = [] }) => {
  const user = await ensureUserFromActor({
    uid,
    email: actorEmail,
    roles: actorRoles,
    displayName: ""
  });
  if (!user) return null;

  const documentSummary = await fetchDocumentSummaryByOwner({
    ownerUserId: user.uid,
    actorEmail,
    actorRoles
  });

  return buildDashboardOverviewPayload({ user, documentSummary });
};

export const updateClientDashboardByUid = async ({
  uid,
  actorUid = "",
  actorEmail,
  actorRoles = [],
  payload
}) => {
  const existingUser = await ensureUserFromActor({
    uid,
    email: actorEmail,
    roles: actorRoles,
    displayName: ""
  });
  if (!existingUser) return null;

  const nextPayload = {
    ...payload,
    "clientDashboard.lastVisitedAt": new Date()
  };

  const updatedUser = await updateUserByUid(uid, { $set: nextPayload });
  if (!updatedUser) return null;

  const documentSummary = await fetchDocumentSummaryByOwner({
    ownerUserId: updatedUser.uid,
    actorEmail,
    actorRoles
  });

  const response = buildDashboardOverviewPayload({
    user: updatedUser,
    documentSummary
  });

  void emitUsersRealtimeEvent({
    eventType: "client.dashboard.updated",
    actorUid: actorUid || uid,
    actorEmail,
    actorRoles,
    audienceUserIds: [uid],
    audienceRoles: ADMIN_EVENT_ROLES,
    payload: {
      uid,
      dashboard: response.dashboard || {},
      onboarding: response.onboarding || {}
    }
  });

  return response;
};

export const getClientDashboardOverviewByUid = async ({
  uid,
  actorEmail,
  actorRoles = []
}) => getClientDashboardByUid({ uid, actorEmail, actorRoles });

export const getAdminDashboardByUid = async ({ uid, actorEmail, actorRoles = [] }) => {
  const user = await ensureUserFromActor({
    uid,
    email: actorEmail,
    roles: actorRoles,
    displayName: ""
  });
  if (!user) return null;

  return buildAdminDashboardPayload({ user });
};

export const updateAdminDashboardByUid = async ({
  uid,
  actorUid = "",
  actorEmail,
  actorRoles = [],
  payload
}) => {
  const existingUser = await ensureUserFromActor({
    uid,
    email: actorEmail,
    roles: actorRoles,
    displayName: ""
  });
  if (!existingUser) return null;

  const nextPayload = {
    ...payload,
    "adminDashboard.lastVisitedAt": new Date()
  };

  const firstName =
    payload["adminProfile.firstName"] !== undefined
      ? payload["adminProfile.firstName"]
      : existingUser.adminProfile?.firstName || "";
  const lastName =
    payload["adminProfile.lastName"] !== undefined
      ? payload["adminProfile.lastName"]
      : existingUser.adminProfile?.lastName || "";
  const explicitDisplayName =
    payload["adminProfile.displayName"] !== undefined
      ? payload["adminProfile.displayName"]
      : existingUser.adminProfile?.displayName || "";
  const derivedDisplayName = explicitDisplayName || [firstName, lastName].filter(Boolean).join(" ").trim();

  if (derivedDisplayName) {
    nextPayload["adminProfile.displayName"] = derivedDisplayName;
    nextPayload.displayName = derivedDisplayName;
  }

  const updatedUser = await updateUserByUid(uid, { $set: nextPayload });
  if (!updatedUser) return null;

  const response = buildAdminDashboardPayload({ user: updatedUser });

  void emitUsersRealtimeEvent({
    eventType: "admin.dashboard.updated",
    actorUid: actorUid || uid,
    actorEmail,
    actorRoles,
    audienceUserIds: [uid],
    audienceRoles: ADMIN_EVENT_ROLES,
    payload: {
      uid,
      dashboard: response.dashboard || {}
    }
  });

  return response;
};

export const getClientWorkspaceByUid = async ({ uid, actorEmail, actorRoles = [] }) => {
  const user = await ensureUserFromActor({
    uid,
    email: actorEmail,
    roles: actorRoles,
    displayName: ""
  });
  if (!user) return null;

  return buildClientWorkspacePayload({ user });
};

export const updateClientWorkspaceByUid = async ({
  uid,
  actorUid = "",
  actorEmail,
  actorRoles = [],
  payload
}) => {
  const existingUser = await ensureUserFromActor({
    uid,
    email: actorEmail,
    roles: actorRoles,
    displayName: ""
  });
  if (!existingUser) return null;

  const nextPayload = {
    ...payload,
    "clientWorkspace.updatedAt": new Date(),
    "clientDashboard.lastVisitedAt": new Date()
  };

  const updatedUser = await updateUserByUid(uid, { $set: nextPayload });
  if (!updatedUser) return null;

  const response = buildClientWorkspacePayload({ user: updatedUser });
  void emitUsersRealtimeEvent({
    eventType: "client.workspace.updated",
    actorUid: actorUid || uid,
    actorEmail,
    actorRoles,
    audienceUserIds: [uid],
    audienceRoles: ADMIN_EVENT_ROLES,
    payload: {
      uid,
      workspaceUpdatedAt: updatedUser.clientWorkspace?.updatedAt || null
    }
  });

  return response;
};

export const listClientManagementClientsForAdmin = async ({ query = {} }) => {
  const filter = buildClientManagementFilter(query);
  const sort = buildClientManagementSort(query);
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Number(query.limit) || 50);
  const skip = (page - 1) * limit;

  const [summary, total, users] = await Promise.all([
    buildClientManagementSummary(),
    countUsers(filter),
    listUsers({ filter, sort, skip, limit })
  ]);

  return {
    summary,
    pagination: {
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit))
    },
    clients: users.map((user) => buildClientManagementRow({ user }))
  };
};

export const getClientManagementClientByUidForAdmin = async ({ uid }) => {
  const user = await findUserByUid(uid);
  if (!user || !isClientUser(user)) return null;

  return buildClientManagementDetail({ user });
};

export const updateClientManagementClientByUidForAdmin = async ({
  uid,
  actorUid = "",
  actorEmail = "",
  actorRoles = [],
  payload = {}
}) => {
  const existing = await findUserByUid(uid);
  if (!existing || !isClientUser(existing)) return null;

  const nextPayload = {
    ...payload,
    "clientWorkspace.updatedAt": new Date(),
    "clientWorkspace.statusControl.updatedAt": new Date()
  };

  const nextVerificationStatus = payload["verification.status"];
  if (nextVerificationStatus === "verified") {
    nextPayload["verification.fullyVerifiedAt"] = existing.verification?.fullyVerifiedAt || new Date();
    nextPayload["verification.stepsCompleted"] = Math.max(
      3,
      Number(existing.verification?.stepsCompleted || 0)
    );
    nextPayload["onboarding.verificationPending"] = false;
  } else if (nextVerificationStatus && nextVerificationStatus !== "verified") {
    nextPayload["verification.fullyVerifiedAt"] = null;
    if (nextPayload["onboarding.verificationPending"] === undefined) {
      nextPayload["onboarding.verificationPending"] = true;
    }
  }

  const updated = await updateUserByUid(uid, { $set: nextPayload });
  if (!updated) return null;

  const response = buildClientManagementDetail({ user: updated });
  void emitUsersRealtimeEvent({
    eventType: "admin.client-management.updated",
    actorUid,
    actorEmail,
    actorRoles,
    audienceUserIds: [uid],
    audienceRoles: ADMIN_EVENT_ROLES,
    payload: {
      uid,
      status: response.status,
      verificationStatus: response.verification?.status || "pending",
      assignedToUid: response.clientWorkspace?.statusControl?.assignedToUid || ""
    }
  });

  return response;
};
