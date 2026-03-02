import {
  deleteUserById,
  findUserByEmail,
  findUserById,
  findUserByUid,
  updateUserByUid,
  updateUserById,
  upsertUserFromAuth
} from "../repositories/users.repository.js";
import { env } from "../config/env.js";

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
  onboarding: user.onboarding || {},
  verification: user.verification || {},
  notificationPreferences: user.notificationPreferences || {},
  dashboard: user.clientDashboard || {},
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
  const supportLeads = Array.isArray(user.adminDashboard?.supportLeads)
    ? user.adminDashboard.supportLeads
    : [];
  const newsletters = Array.isArray(user.adminDashboard?.newsletters)
    ? user.adminDashboard.newsletters
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
    adminProfile: user.adminProfile || {},
    dashboard: {
      ...(user.adminDashboard || {}),
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

export const updateClientProfileByUid = async ({ uid, actorEmail, actorRoles = [], payload }) => {
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

  return updateUserByUid(uid, { $set: nextPayload });
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

export const updateClientDashboardByUid = async ({ uid, actorEmail, actorRoles = [], payload }) => {
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

  return buildDashboardOverviewPayload({
    user: updatedUser,
    documentSummary
  });
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

export const updateAdminDashboardByUid = async ({ uid, actorEmail, actorRoles = [], payload }) => {
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

  return buildAdminDashboardPayload({ user: updatedUser });
};
