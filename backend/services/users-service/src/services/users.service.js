import {
  countUsers,
  deleteUserByUid,
  findUserByEmail,
  findUserByClientPhone,
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

const SIGNUP_CAPTURE_FIELDS = Object.freeze([
  "signupIp",
  "signupLocation",
  "signupSource",
  "capturePage",
  "capturePath"
]);

const normalizeSignupCapture = (value = {}) => {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return SIGNUP_CAPTURE_FIELDS.reduce((accumulator, field) => {
    accumulator[field] = String(source[field] || "").trim();
    return accumulator;
  }, {});
};

const hasSignupCaptureValues = (value = {}) =>
  SIGNUP_CAPTURE_FIELDS.some((field) => Boolean(String(value?.[field] || "").trim()));

const mergeSignupCapture = ({
  current = {},
  next = {}
} = {}) => {
  const normalizedCurrent = normalizeSignupCapture(current);
  const normalizedNext = normalizeSignupCapture(next);
  return SIGNUP_CAPTURE_FIELDS.reduce((accumulator, field) => {
    accumulator[field] = normalizedCurrent[field] || normalizedNext[field];
    return accumulator;
  }, {});
};

export const syncUserFromAuth = async ({
  uid,
  email,
  displayName,
  roles,
  signupCapture
}) => {
  const normalizedUid = String(uid || "").trim();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const existingUser =
    (normalizedUid ? await findUserByUid(normalizedUid) : null) ||
    (normalizedEmail ? await findUserByEmail(normalizedEmail) : null);

  const user = await upsertUserFromAuth({ uid, email, displayName, roles });
  const normalizedSignupCapture = normalizeSignupCapture(signupCapture);
  const shouldBackfillSignupCapture = hasSignupCaptureValues(normalizedSignupCapture) && user;
  let resolvedUser = user;

  if (shouldBackfillSignupCapture) {
    const mergedSignupCapture = mergeSignupCapture({
      current: user?.signupCapture,
      next: normalizedSignupCapture
    });
    const changed = SIGNUP_CAPTURE_FIELDS.some((field) => (
      String(user?.signupCapture?.[field] || "").trim() !== mergedSignupCapture[field]
    ));
    if (changed) {
      resolvedUser = await updateUserByUid(user.uid, {
        $set: {
          signupCapture: mergedSignupCapture
        }
      });
    }
  }

  if (resolvedUser && !existingUser && isClientUser(resolvedUser)) {
    void emitUsersRealtimeEvent({
      eventType: "admin.client-management.updated",
      actorUid: resolvedUser.uid,
      actorEmail: resolvedUser.email,
      actorRoles: Array.isArray(resolvedUser.roles) ? resolvedUser.roles : [CLIENT_ROLE],
      audienceUserIds: [resolvedUser.uid],
      audienceRoles: ADMIN_EVENT_ROLES,
      payload: {
        uid: resolvedUser.uid,
        status: resolvedUser.status || "active",
        verificationStatus: resolvedUser.verification?.status || "pending",
        assignedToUid: String(resolvedUser.clientWorkspace?.statusControl?.assignedToUid || "").trim()
      }
    });
  }

  return resolvedUser;
};

export const getMeByUid = async (uid) => findUserByUid(uid);

export const getUserById = async (id) => findUserById(id);

export const updateUser = async ({ id, payload }) => updateUserById(id, payload);

const SUPPORTED_PHONE_COUNTRY_CODES = ["+234", "+44", "+61", "+1"];

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

const createHttpError = (status, message, details = null) => {
  const error = new Error(message);
  error.status = status;
  if (details && typeof details === "object") {
    error.details = details;
  }
  return error;
};

const sanitizePhoneDigits = (value = "") =>
  String(value || "").replace(/\D/g, "");

const PHONE_LOCAL_NUMBER_PATTERN = /^\d{10,11}$/;

const normalizeLocalPhoneDigits = (value = "") => {
  const rawDigits = sanitizePhoneDigits(value);
  if (!PHONE_LOCAL_NUMBER_PATTERN.test(rawDigits)) {
    return {
      rawDigits,
      localDigits: "",
      valid: false
    };
  }
  return {
    rawDigits,
    localDigits:
      rawDigits.length === 11 && rawDigits.startsWith("0")
        ? rawDigits.slice(1)
        : rawDigits,
    valid: true
  };
};

const resolvePhoneCountryCodeFromRaw = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw.startsWith("+")) {
    return "";
  }

  const supportedMatch = SUPPORTED_PHONE_COUNTRY_CODES
    .slice()
    .sort((left, right) => right.length - left.length)
    .find((code) => raw.startsWith(code));
  if (supportedMatch) {
    return supportedMatch;
  }

  const fallbackMatch = raw.match(/^\+\d{1,4}/);
  return fallbackMatch ? fallbackMatch[0] : "";
};

const normalizePhoneIdentity = ({
  phoneCountryCode = "",
  phoneLocalNumber = "",
  phone = "",
  fallbackCountryCode = "+234"
} = {}) => {
  const explicitCountryCode = String(phoneCountryCode || "").trim();
  const localPhoneInfo = normalizeLocalPhoneDigits(phoneLocalNumber);
  const localDigits = localPhoneInfo.localDigits;
  const rawPhone = String(phone || "").trim();

  if (localPhoneInfo.rawDigits) {
    if (!localPhoneInfo.valid) {
      return {
        phoneCountryCode: explicitCountryCode || fallbackCountryCode,
        phoneLocalNumber: "",
        compactPhone: "",
        displayPhone: "",
        variants: [],
        valid: false,
        rawDigits: localPhoneInfo.rawDigits
      };
    }
    const resolvedCountryCode = explicitCountryCode || fallbackCountryCode;
    const compactPhone = `${resolvedCountryCode}${localDigits}`.replace(/\s+/g, "");
    const displayPhone = `${resolvedCountryCode} ${localDigits}`.trim();
    const legacyCompactPhone =
      localPhoneInfo.rawDigits && localPhoneInfo.rawDigits !== localDigits
        ? `${resolvedCountryCode}${localPhoneInfo.rawDigits}`.replace(/\s+/g, "")
        : "";
    const legacyDisplayPhone =
      localPhoneInfo.rawDigits && localPhoneInfo.rawDigits !== localDigits
        ? `${resolvedCountryCode} ${localPhoneInfo.rawDigits}`.trim()
        : "";
    return {
      phoneCountryCode: resolvedCountryCode,
      phoneLocalNumber: localDigits,
      compactPhone,
      displayPhone,
      variants: [...new Set([compactPhone, displayPhone, legacyCompactPhone, legacyDisplayPhone].filter(Boolean))],
      valid: true,
      rawDigits: localPhoneInfo.rawDigits
    };
  }

  if (!rawPhone) {
    return {
      phoneCountryCode: explicitCountryCode || fallbackCountryCode,
      phoneLocalNumber: "",
      compactPhone: "",
      displayPhone: "",
      variants: [],
      valid: true,
      rawDigits: ""
    };
  }

  const compactRawPhone = rawPhone.replace(/\s+/g, "");
  const compactRawDigits = sanitizePhoneDigits(compactRawPhone);
  const resolvedCountryCode =
    explicitCountryCode || resolvePhoneCountryCodeFromRaw(rawPhone) || fallbackCountryCode;
  const countryDigits = sanitizePhoneDigits(resolvedCountryCode);
  const derivedLocalPhoneInfo = normalizeLocalPhoneDigits(
    countryDigits && compactRawDigits.startsWith(countryDigits)
      ? compactRawDigits.slice(countryDigits.length)
      : compactRawDigits
  );
  const derivedLocalDigits = derivedLocalPhoneInfo.localDigits;
  if (!derivedLocalPhoneInfo.valid) {
    return {
      phoneCountryCode: resolvedCountryCode,
      phoneLocalNumber: "",
      compactPhone: "",
      displayPhone: "",
      variants: [],
      valid: false,
      rawDigits: derivedLocalPhoneInfo.rawDigits
    };
  }
  const compactPhone = derivedLocalDigits ? `${resolvedCountryCode}${derivedLocalDigits}` : "";
  const displayPhone = derivedLocalDigits ? `${resolvedCountryCode} ${derivedLocalDigits}`.trim() : "";
  const legacyCompactPhone =
    derivedLocalPhoneInfo.rawDigits && derivedLocalPhoneInfo.rawDigits !== derivedLocalDigits
      ? `${resolvedCountryCode}${derivedLocalPhoneInfo.rawDigits}`.replace(/\s+/g, "")
      : "";
  const legacyDisplayPhone =
    derivedLocalPhoneInfo.rawDigits && derivedLocalPhoneInfo.rawDigits !== derivedLocalDigits
      ? `${resolvedCountryCode} ${derivedLocalPhoneInfo.rawDigits}`.trim()
      : "";

  return {
    phoneCountryCode: resolvedCountryCode,
    phoneLocalNumber: derivedLocalDigits,
    compactPhone,
    displayPhone,
    variants: [...new Set([compactRawPhone, compactPhone, displayPhone, legacyCompactPhone, legacyDisplayPhone].filter(Boolean))],
    valid: true,
    rawDigits: derivedLocalPhoneInfo.rawDigits
  };
};

const assertClientPhoneAvailable = async ({
  uid = "",
  phoneCountryCode = "",
  phoneLocalNumber = "",
  phone = ""
} = {}) => {
  const normalizedPhone = normalizePhoneIdentity({
    phoneCountryCode,
    phoneLocalNumber,
    phone
  });

  const attemptedPhoneInput = Boolean(
    String(phoneCountryCode || "").trim()
      || String(phoneLocalNumber || "").trim()
      || String(phone || "").trim()
  );

  if (attemptedPhoneInput && !normalizedPhone.valid) {
    throw createHttpError(400, "Phone number must be 10 or 11 digits.");
  }

  if (!normalizedPhone.phoneLocalNumber) {
    return normalizedPhone;
  }

  const existingUser = await findUserByClientPhone({
    excludeUid: uid,
    phoneCountryCode: normalizedPhone.phoneCountryCode,
    phoneLocalNumber: normalizedPhone.phoneLocalNumber,
    phoneVariants: normalizedPhone.variants
  });
  if (existingUser) {
    throw createHttpError(409, "This phone number is already assigned to another account.");
  }

  return normalizedPhone;
};

export const getClientPhoneAvailability = async ({ phoneNumber = "" } = {}) => {
  const normalizedPhone = normalizePhoneIdentity({ phone: phoneNumber });
  if (!normalizedPhone.valid || !normalizedPhone.phoneLocalNumber) {
    return {
      available: false,
      phoneNumber: "",
      message: "Phone number must be 10 or 11 digits."
    };
  }

  const existingUser = await findUserByClientPhone({
    phoneCountryCode: normalizedPhone.phoneCountryCode,
    phoneLocalNumber: normalizedPhone.phoneLocalNumber,
    phoneVariants: normalizedPhone.variants
  });

  return {
    available: !existingUser,
    phoneNumber: normalizedPhone.compactPhone || normalizedPhone.displayPhone,
    message: existingUser
      ? "This phone number is already assigned to another account."
      : "Phone number is available."
  };
};

const requestServiceJson = async ({
  url,
  method = "GET",
  headers = {},
  body = null,
  timeoutMs = 6000
}) => {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: abortController.signal
    });
    const data = await response.json().catch(() => null);
    const message = String(data?.message || "").trim();
    return {
      ok: response.ok,
      status: response.status,
      data,
      message
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      return {
        ok: false,
        status: 0,
        data: null,
        message: "request-timeout"
      };
    }
    return {
      ok: false,
      status: 0,
      data: null,
      message: String(error?.message || "network-request-failed")
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

const purgeDocumentsForOwner = async ({
  ownerUserId,
  actorUid = "",
  actorEmail = "",
  actorRoles = []
}) => {
  if (!ownerUserId) {
    return {
      attempted: false,
      skipped: true,
      reason: "missing-owner-user-id"
    };
  }

  if (!env.documentsServiceUrl) {
    return {
      attempted: false,
      skipped: true,
      reason: "documents-service-url-not-configured"
    };
  }

  const response = await requestServiceJson({
    url: `${env.documentsServiceUrl}/api/v1/documents/owner/${encodeURIComponent(ownerUserId)}`,
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": String(actorUid || ownerUserId),
      "x-user-email": String(actorEmail || ""),
      "x-user-roles": Array.isArray(actorRoles) ? actorRoles.join(",") : ""
    },
    timeoutMs: env.documentsServiceTimeoutMs
  });

  if (!response.ok) {
    const statusCode = response.status || 502;
    const statusMessage = statusCode === 403 ? "not-authorized-to-purge-documents" : "documents-purge-failed";
    throw createHttpError(statusCode, response.message || statusMessage, {
      ownerUserId,
      statusCode,
      reason: response.message || statusMessage
    });
  }

  return {
    attempted: true,
    skipped: false,
    ownerUserId,
    deletedDocuments: Number(response.data?.deletedDocuments || 0),
    deletedAccountingRecords: Number(response.data?.deletedAccountingRecords || 0),
    deletedStorageObjects: Number(response.data?.deletedStorageObjects || 0),
    failedStorageObjectDeletes: Number(response.data?.failedStorageObjectDeletes || 0)
  };
};

const deleteAuthAccountForUid = async ({
  targetUid,
  actorUid = "",
  actorEmail = "",
  actorRoles = [],
  reason = "account-deleted"
}) => {
  if (!targetUid || !env.authServiceUrl) {
    return {
      attempted: false,
      skipped: true,
      reason: !targetUid ? "missing-target-uid" : "auth-service-url-not-configured"
    };
  }

  const normalizedTargetUid = String(targetUid).trim();
  const normalizedActorUid = String(actorUid || normalizedTargetUid).trim();
  const normalizedReason = String(reason || "").trim() || "account-deleted";
  const actorIsTarget = normalizedActorUid === normalizedTargetUid;
  const path = actorIsTarget
    ? "/api/v1/auth/account"
    : `/api/v1/auth/account/${encodeURIComponent(normalizedTargetUid)}`;

  const response = await requestServiceJson({
    url: `${env.authServiceUrl}${path}`,
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": normalizedActorUid,
      "x-user-email": String(actorEmail || ""),
      "x-user-roles": Array.isArray(actorRoles) ? actorRoles.join(",") : ""
    },
    body: JSON.stringify({
      reason: normalizedReason
    }),
    timeoutMs: env.authServiceTimeoutMs
  });

  if (!response.ok && response.status !== 404) {
    throw createHttpError(response.status || 502, response.message || "auth-account-deletion-failed", {
      targetUid: normalizedTargetUid,
      statusCode: response.status || 502,
      reason: response.message || "auth-account-deletion-failed"
    });
  }

  return {
    attempted: true,
    skipped: false,
    targetUid: normalizedTargetUid,
    deleted: response.status === 404 ? false : Boolean(response.data?.deleted !== false),
    revokedSessionCount: Number(response.data?.revokedSessionCount || 0)
  };
};

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

const normalizeWorkspaceNotifications = (rows = []) => {
  const seenIds = new Set();
  return (Array.isArray(rows) ? rows : [])
    .filter((entry) => entry && typeof entry === "object")
    .map((entry, index) => {
      const explicitId = String(entry.id || "").trim();
      const fallbackId = `notification-${Date.now()}-${index}`;
      const id = explicitId || fallbackId;
      if (seenIds.has(id)) {
        return null;
      }
      seenIds.add(id);
      return {
        ...entry,
        id,
        read: Boolean(entry.read)
      };
    })
    .filter(Boolean)
    .slice(0, 120);
};

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
  clientProfile: toPlainObject(user.clientProfile, {}),
  entityProfile: toPlainObject(user.entityProfile, {}),
  onboarding: toPlainObject(user.onboarding, {}),
  signupCapture: toPlainObject(user.signupCapture, {}),
  verification: toPlainObject(user.verification, {}),
  notificationPreferences: toPlainObject(user.notificationPreferences, {}),
  clientDashboard: toPlainObject(user.clientDashboard, {}),
  clientWorkspace: toPlainObject(user.clientWorkspace, {}),
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
  signupCapture: toPlainObject(user.signupCapture, {}),
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

const normalizeDeletionReason = (value = "", fallback = "account-deleted") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return normalized.slice(0, 120);
};

const deleteUserCascadeForTargetUid = async ({
  targetUid,
  actorUid = "",
  actorEmail = "",
  actorRoles = [],
  reason = "account-deleted"
}) => {
  const normalizedTargetUid = String(targetUid || "").trim();
  if (!normalizedTargetUid) {
    throw createHttpError(400, "Target uid is required for deletion.");
  }

  const existingUser = await findUserByUid(normalizedTargetUid);
  if (!existingUser) {
    return null;
  }

  const normalizedReason = normalizeDeletionReason(reason, "account-deleted");
  const cascadeResult = {
    user: null,
    cascade: {
      documents: null,
      auth: null
    }
  };

  cascadeResult.cascade.documents = await purgeDocumentsForOwner({
    ownerUserId: normalizedTargetUid,
    actorUid: actorUid || normalizedTargetUid,
    actorEmail,
    actorRoles
  });

  cascadeResult.cascade.auth = await deleteAuthAccountForUid({
    targetUid: normalizedTargetUid,
    actorUid: actorUid || normalizedTargetUid,
    actorEmail,
    actorRoles,
    reason: normalizedReason
  });

  const deletedUser = await deleteUserByUid(normalizedTargetUid);
  if (!deletedUser) {
    throw createHttpError(409, "Account deletion conflict. Please retry.");
  }
  cascadeResult.user = deletedUser;

  void emitUsersRealtimeEvent({
    eventType: "user.account.deleted",
    actorUid: actorUid || normalizedTargetUid,
    actorEmail,
    actorRoles,
    audienceRoles: ADMIN_EVENT_ROLES,
    payload: {
      uid: normalizedTargetUid,
      email: deletedUser.email || "",
      reason: normalizedReason
    }
  });

  return cascadeResult;
};

export const deleteUserForUid = async ({
  uid,
  actorUid = "",
  actorEmail = "",
  actorRoles = [],
  reason = "account-deleted"
}) =>
  deleteUserCascadeForTargetUid({
    targetUid: uid,
    actorUid,
    actorEmail,
    actorRoles,
    reason
  });

export const deleteUser = async ({
  id,
  actorUid = "",
  actorEmail = "",
  actorRoles = [],
  reason = "admin-account-deleted"
}) => {
  const existingUser = await findUserById(id);
  if (!existingUser) {
    return null;
  }

  return deleteUserCascadeForTargetUid({
    targetUid: existingUser.uid,
    actorUid,
    actorEmail,
    actorRoles,
    reason
  });
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
    adminAccess: toPlainObject(user.adminAccess, {}),
    dashboard: {
      ...adminDashboard,
      securityPreferences: toPlainObject(adminDashboard.securityPreferences, {}),
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

const sortAdminSupportLeads = (rows = []) =>
  [...rows].sort((left, right) => {
    const rightTime = Date.parse(right?.updatedAt || right?.createdAt || "") || 0;
    const leftTime = Date.parse(left?.updatedAt || left?.createdAt || "") || 0;
    if (rightTime !== leftTime) return rightTime - leftTime;
    return String(left?.leadId || left?.email || "").localeCompare(String(right?.leadId || right?.email || ""));
  });

const sortAdminNewsletters = (rows = []) =>
  [...rows].sort((left, right) => {
    const rightTime = Date.parse(right?.lastEngagedAt || right?.subscribedAt || "") || 0;
    const leftTime = Date.parse(left?.lastEngagedAt || left?.subscribedAt || "") || 0;
    if (rightTime !== leftTime) return rightTime - leftTime;
    return String(left?.email || "").localeCompare(String(right?.email || ""));
  });

const upsertAdminSupportLead = ({
  existingEntries = [],
  lead
} = {}) => {
  const safeEntries = Array.isArray(existingEntries) ? existingEntries.map((entry) => ({ ...entry })) : [];
  const normalizedLeadId = String(lead?.leadId || "").trim();
  const normalizedEmail = String(lead?.email || "").trim().toLowerCase();
  const existingIndex = safeEntries.findIndex((entry) => {
    const entryLeadId = String(entry?.leadId || "").trim();
    const entryEmail = String(entry?.email || "").trim().toLowerCase();
    if (normalizedLeadId && entryLeadId && entryLeadId === normalizedLeadId) return true;
    return normalizedEmail && entryEmail && entryEmail === normalizedEmail;
  });

  const current = existingIndex >= 0 ? safeEntries[existingIndex] : null;
  const nextEntry = {
    leadId: normalizedLeadId || String(current?.leadId || "").trim(),
    fullName: String(lead?.fullName || current?.fullName || "").trim(),
    email: normalizedEmail || String(current?.email || "").trim().toLowerCase(),
    companyName: String(lead?.companyName || current?.companyName || "").trim(),
    phone: String(lead?.phone || current?.phone || "").trim(),
    leadIpAddress: String(lead?.leadIpAddress || current?.leadIpAddress || "").trim(),
    leadCountry: String(lead?.leadCountry || current?.leadCountry || "").trim(),
    leadLocation: String(lead?.leadLocation || current?.leadLocation || "").trim(),
    capturePage: String(lead?.capturePage || current?.capturePage || "").trim(),
    capturePath: String(lead?.capturePath || current?.capturePath || "").trim(),
    source: String(lead?.source || current?.source || "support-form").trim(),
    status: String(lead?.status || current?.status || "new").trim().toLowerCase(),
    interest: String(lead?.interest || current?.interest || "").trim(),
    assignedToUid: String(lead?.assignedToUid || current?.assignedToUid || "").trim(),
    notes: String(lead?.notes || current?.notes || "").trim(),
    createdAt: current?.createdAt || lead?.createdAt || new Date(),
    updatedAt: lead?.updatedAt || new Date()
  };

  if (existingIndex >= 0) {
    safeEntries.splice(existingIndex, 1, nextEntry);
  } else {
    safeEntries.push(nextEntry);
  }

  return sortAdminSupportLeads(safeEntries);
};

const upsertAdminNewsletter = ({
  existingEntries = [],
  newsletter
} = {}) => {
  const safeEntries = Array.isArray(existingEntries) ? existingEntries.map((entry) => ({ ...entry })) : [];
  const normalizedEmail = String(newsletter?.email || "").trim().toLowerCase();
  const existingIndex = safeEntries.findIndex((entry) => (
    String(entry?.email || "").trim().toLowerCase() === normalizedEmail
  ));

  const current = existingIndex >= 0 ? safeEntries[existingIndex] : null;
  const nextEntry = {
    email: normalizedEmail,
    fullName: String(newsletter?.fullName || current?.fullName || "").trim(),
    leadIpAddress: String(newsletter?.leadIpAddress || current?.leadIpAddress || "").trim(),
    leadCountry: String(newsletter?.leadCountry || current?.leadCountry || "").trim(),
    leadLocation: String(newsletter?.leadLocation || current?.leadLocation || "").trim(),
    capturePage: String(newsletter?.capturePage || current?.capturePage || "").trim(),
    capturePath: String(newsletter?.capturePath || current?.capturePath || "").trim(),
    status: String(newsletter?.status || current?.status || "subscribed").trim().toLowerCase(),
    source: String(newsletter?.source || current?.source || "website").trim(),
    tags: [...new Set(
      [
        ...(Array.isArray(current?.tags) ? current.tags : []),
        ...(Array.isArray(newsletter?.tags) ? newsletter.tags : [])
      ]
        .map((tag) => String(tag || "").trim())
        .filter(Boolean)
    )],
    subscribedAt: current?.subscribedAt || newsletter?.subscribedAt || new Date(),
    lastEngagedAt: newsletter?.lastEngagedAt || new Date()
  };

  if (existingIndex >= 0) {
    safeEntries.splice(existingIndex, 1, nextEntry);
  } else {
    safeEntries.push(nextEntry);
  }

  return sortAdminNewsletters(safeEntries);
};

const buildAdminDashboardCollectionsPatch = ({
  supportLeads = [],
  newsletters = []
} = {}) => ({
  "adminDashboard.supportLeads": supportLeads,
  "adminDashboard.newsletters": newsletters,
  "adminDashboard.stats.openSupportLeads": supportLeads.filter(
    (entry) => entry?.status !== "closed" && entry?.status !== "converted"
  ).length,
  "adminDashboard.stats.newsletterSubscribers": newsletters.filter(
    (entry) => entry?.status === "subscribed"
  ).length,
  "adminDashboard.stats.newsletterUnsubscribed": newsletters.filter(
    (entry) => entry?.status === "unsubscribed"
  ).length
});

const listAdminUsersForDashboardUpdates = async () =>
  listUsers({
    filter: { roles: { $in: ADMIN_EVENT_ROLES } },
    sort: { createdAt: 1 },
    limit: 500
  });

const buildAdminStaffRow = ({ user }) => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName || "",
  status: user.status || "active",
  roles: Array.isArray(user.roles) ? user.roles : [],
  createdAt: user.createdAt || null,
  updatedAt: user.updatedAt || null,
  adminProfile: toPlainObject(user.adminProfile, {}),
  adminAccess: toPlainObject(user.adminAccess, {}),
  dashboardSecurityPreferences: toPlainObject(user.adminDashboard?.securityPreferences, {})
});

const emitAdminDashboardRealtimeUpdate = ({
  updatedUser,
  payload
} = {}) => {
  if (!updatedUser) return;
  void emitUsersRealtimeEvent({
    eventType: "admin.dashboard.updated",
    actorUid: "public-web",
    actorEmail: "",
    actorRoles: ["public"],
    audienceUserIds: [updatedUser.uid],
    audienceRoles: ADMIN_EVENT_ROLES,
    payload: {
      uid: updatedUser.uid,
      dashboard: payload?.dashboard || {}
    }
  });
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

  const hasPhoneUpdate =
    payload["clientProfile.phoneCountryCode"] !== undefined
    || payload["clientProfile.phoneLocalNumber"] !== undefined
    || payload["clientProfile.phone"] !== undefined;
  const phoneCountryCode =
    hasPhoneUpdate && payload["clientProfile.phoneCountryCode"] !== undefined
      ? payload["clientProfile.phoneCountryCode"]
      : existingUser.clientProfile?.phoneCountryCode || "+234";
  const phoneLocalNumber =
    hasPhoneUpdate && payload["clientProfile.phoneLocalNumber"] !== undefined
      ? payload["clientProfile.phoneLocalNumber"]
      : existingUser.clientProfile?.phoneLocalNumber || "";
  const rawPhoneValue =
    hasPhoneUpdate && payload["clientProfile.phone"] !== undefined
      ? payload["clientProfile.phone"]
      : existingUser.clientProfile?.phone || "";
  const normalizedPhone = hasPhoneUpdate
    ? await assertClientPhoneAvailable({
      uid,
      phoneCountryCode,
      phoneLocalNumber,
      phone: rawPhoneValue
    })
    : {
      phoneCountryCode: existingUser.clientProfile?.phoneCountryCode || "+234",
      phoneLocalNumber: existingUser.clientProfile?.phoneLocalNumber || "",
      displayPhone: existingUser.clientProfile?.phone || ""
    };

  const nextPayload = {
    ...payload,
    "clientProfile.firstName": normalizedFirstName,
    "clientProfile.lastName": normalizedLastName,
    "clientProfile.otherNames": normalizedOtherNames,
    "clientProfile.fullName": fullName,
    displayName: fullName || existingUser.displayName || ""
  };
  if (hasPhoneUpdate) {
    nextPayload["clientProfile.phoneCountryCode"] = normalizedPhone.phoneCountryCode;
    nextPayload["clientProfile.phoneLocalNumber"] = normalizedPhone.phoneLocalNumber;
    nextPayload["clientProfile.phone"] = normalizedPhone.displayPhone;
  }

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
  nextPayload["clientWorkspace.updatedAt"] = new Date();
  nextPayload["clientWorkspace.settingsProfile.firstName"] = normalizedFirstName;
  nextPayload["clientWorkspace.settingsProfile.lastName"] = normalizedLastName;
  nextPayload["clientWorkspace.settingsProfile.otherNames"] = normalizedOtherNames;
  nextPayload["clientWorkspace.settingsProfile.fullName"] = fullName;
  nextPayload["clientWorkspace.settingsProfile.email"] = existingUser.email || actorEmail || "";
  nextPayload["clientWorkspace.settingsProfile.phoneCountryCode"] = normalizedPhone.phoneCountryCode;
  nextPayload["clientWorkspace.settingsProfile.phoneLocalNumber"] = normalizedPhone.phoneLocalNumber;
  nextPayload["clientWorkspace.settingsProfile.phone"] = normalizedPhone.displayPhone;
  nextPayload["clientWorkspace.settingsProfile.roleInCompany"] =
    nextPayload["clientProfile.roleInCompany"] !== undefined
      ? nextPayload["clientProfile.roleInCompany"]
      : existingUser.clientProfile?.roleInCompany || "";
  nextPayload["clientWorkspace.settingsProfile.address1"] =
    nextPayload["clientProfile.address1"] !== undefined
      ? nextPayload["clientProfile.address1"]
      : existingUser.clientProfile?.address1 || "";
  nextPayload["clientWorkspace.settingsProfile.address2"] =
    nextPayload["clientProfile.address2"] !== undefined
      ? nextPayload["clientProfile.address2"]
      : existingUser.clientProfile?.address2 || "";
  nextPayload["clientWorkspace.settingsProfile.city"] =
    nextPayload["clientProfile.city"] !== undefined
      ? nextPayload["clientProfile.city"]
      : existingUser.clientProfile?.city || "";
  nextPayload["clientWorkspace.settingsProfile.postalCode"] =
    nextPayload["clientProfile.postalCode"] !== undefined
      ? nextPayload["clientProfile.postalCode"]
      : existingUser.clientProfile?.postalCode || "";
  nextPayload["clientWorkspace.settingsProfile.addressCountry"] =
    nextPayload["clientProfile.addressCountry"] !== undefined
      ? nextPayload["clientProfile.addressCountry"]
      : existingUser.clientProfile?.addressCountry || "Nigeria";
  nextPayload["clientWorkspace.settingsProfile.businessType"] = businessType;
  nextPayload["clientWorkspace.settingsProfile.businessName"] = businessName;
  nextPayload["clientWorkspace.settingsProfile.country"] = businessCountry;
  nextPayload["clientWorkspace.settingsProfile.currency"] = baseCurrency;
  nextPayload["clientWorkspace.settingsProfile.language"] =
    nextPayload["clientProfile.language"] !== undefined
      ? nextPayload["clientProfile.language"]
      : existingUser.clientProfile?.language || "English";
  nextPayload["clientWorkspace.settingsProfile.industry"] =
    nextPayload["entityProfile.industry"] !== undefined
      ? nextPayload["entityProfile.industry"]
      : existingUser.entityProfile?.industry || "";
  nextPayload["clientWorkspace.settingsProfile.industryOther"] =
    nextPayload["entityProfile.industryOther"] !== undefined
      ? nextPayload["entityProfile.industryOther"]
      : existingUser.entityProfile?.industryOther || "";
  nextPayload["clientWorkspace.settingsProfile.cacNumber"] =
    nextPayload["entityProfile.cacNumber"] !== undefined
      ? nextPayload["entityProfile.cacNumber"]
      : existingUser.entityProfile?.cacNumber || "";
  nextPayload["clientWorkspace.settingsProfile.tin"] =
    nextPayload["entityProfile.tin"] !== undefined
      ? nextPayload["entityProfile.tin"]
      : existingUser.entityProfile?.tin || "";
  nextPayload["clientWorkspace.settingsProfile.reportingCycle"] =
    nextPayload["entityProfile.reportingCycle"] !== undefined
      ? nextPayload["entityProfile.reportingCycle"]
      : existingUser.entityProfile?.reportingCycle || "";
  nextPayload["clientWorkspace.settingsProfile.startMonth"] =
    nextPayload["entityProfile.startMonth"] !== undefined
      ? nextPayload["entityProfile.startMonth"]
      : existingUser.entityProfile?.startMonth || "";

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

export const listAdminStaffForAdmin = async () => {
  const users = await listUsers({
    filter: { roles: { $in: ADMIN_EVENT_ROLES } },
    sort: { createdAt: 1 },
    limit: 500
  });

  return {
    total: users.length,
    staff: users.map((user) => buildAdminStaffRow({ user }))
  };
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

export const updateAdminStaffByUid = async ({
  uid,
  actorUid = "",
  actorEmail,
  actorRoles = [],
  payload
}) => {
  const existingUser = await findUserByUid(uid);
  if (!existingUser) return null;

  const nextPayload = {
    ...payload
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

  void emitUsersRealtimeEvent({
    eventType: "admin.dashboard.updated",
    actorUid: actorUid || uid,
    actorEmail,
    actorRoles,
    audienceUserIds: [uid],
    audienceRoles: ADMIN_EVENT_ROLES,
    payload: {
      uid,
      adminProfile: toPlainObject(updatedUser.adminProfile, {}),
      adminAccess: toPlainObject(updatedUser.adminAccess, {})
    }
  });

  return updatedUser;
};

export const upsertPublicSupportLead = async ({
  payload
}) => {
  const adminUsers = await listAdminUsersForDashboardUpdates();
  const updatedDashboards = [];

  for (const adminUser of adminUsers) {
    const adminDashboard = toPlainObject(adminUser.adminDashboard, {});
    const supportLeads = upsertAdminSupportLead({
      existingEntries: Array.isArray(adminDashboard.supportLeads) ? adminDashboard.supportLeads : [],
      lead: payload
    });
    const newsletters = sortAdminNewsletters(
      Array.isArray(adminDashboard.newsletters) ? adminDashboard.newsletters : []
    );
    const updatedUser = await updateUserByUid(adminUser.uid, {
      $set: buildAdminDashboardCollectionsPatch({ supportLeads, newsletters })
    });
    if (!updatedUser) continue;

    const dashboardPayload = buildAdminDashboardPayload({ user: updatedUser });
    updatedDashboards.push(dashboardPayload);
    emitAdminDashboardRealtimeUpdate({
      updatedUser,
      payload: dashboardPayload
    });
  }

  return {
    lead: payload,
    adminsUpdated: updatedDashboards.length
  };
};

export const upsertPublicNewsletterSubscription = async ({
  payload
}) => {
  const adminUsers = await listAdminUsersForDashboardUpdates();
  const updatedDashboards = [];

  for (const adminUser of adminUsers) {
    const adminDashboard = toPlainObject(adminUser.adminDashboard, {});
    const supportLeads = sortAdminSupportLeads(
      Array.isArray(adminDashboard.supportLeads) ? adminDashboard.supportLeads : []
    );
    const newsletters = upsertAdminNewsletter({
      existingEntries: Array.isArray(adminDashboard.newsletters) ? adminDashboard.newsletters : [],
      newsletter: payload
    });
    const updatedUser = await updateUserByUid(adminUser.uid, {
      $set: buildAdminDashboardCollectionsPatch({ supportLeads, newsletters })
    });
    if (!updatedUser) continue;

    const dashboardPayload = buildAdminDashboardPayload({ user: updatedUser });
    updatedDashboards.push(dashboardPayload);
    emitAdminDashboardRealtimeUpdate({
      updatedUser,
      payload: dashboardPayload
    });
  }

  return {
    newsletter: payload,
    adminsUpdated: updatedDashboards.length
  };
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

  if (payload["clientWorkspace.notifications"] !== undefined) {
    const existingNotifications = normalizeWorkspaceNotifications(
      existing.clientWorkspace?.notifications || []
    );
    const incomingNotifications = normalizeWorkspaceNotifications(
      payload["clientWorkspace.notifications"]
    );
    nextPayload["clientWorkspace.notifications"] = normalizeWorkspaceNotifications([
      ...incomingNotifications,
      ...existingNotifications
    ]);
  }

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

  void emitUsersRealtimeEvent({
    eventType: "client.workspace.updated",
    actorUid,
    actorEmail,
    actorRoles,
    audienceUserIds: [uid],
    audienceRoles: [],
    payload: {
      uid,
      workspaceUpdatedAt: response.clientWorkspace?.updatedAt || null
    }
  });

  return response;
};
