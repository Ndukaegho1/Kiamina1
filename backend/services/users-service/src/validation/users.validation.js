const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_STATUS = new Set(["active", "disabled"]);
const USER_ROLES = new Set([
  "client",
  "admin",
  "accountant",
  "manager",
  "owner",
  "superadmin"
]);

const normalizeString = (value) => String(value ?? "").trim();

const normalizeRoles = (roles) => {
  if (!Array.isArray(roles)) {
    return null;
  }

  const normalized = roles
    .map((role) => normalizeString(role).toLowerCase())
    .filter(Boolean);

  const unique = [...new Set(normalized)];
  return unique;
};

export const validateSyncFromAuthPayload = (body) => {
  const uid = normalizeString(body?.uid);
  const email = normalizeString(body?.email).toLowerCase();
  const displayName = body?.displayName === undefined ? "" : normalizeString(body.displayName);
  const errors = [];

  if (!uid) {
    errors.push("uid is required");
  }

  if (!email) {
    errors.push("email is required");
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push("email must be a valid email address");
  }

  if (displayName.length > 120) {
    errors.push("displayName must be at most 120 characters");
  }

  let roles;
  if (body?.roles !== undefined) {
    roles = normalizeRoles(body.roles);
    if (!roles) {
      errors.push("roles must be an array of strings");
    } else if (roles.some((role) => !USER_ROLES.has(role))) {
      errors.push("roles contain unsupported values");
    }
  }

  return {
    errors,
    payload: {
      uid,
      email,
      displayName,
      roles
    }
  };
};

export const buildUserUpdatePayload = (body) => {
  const payload = {};
  const errors = [];

  if (body?.email !== undefined) {
    const email = normalizeString(body.email).toLowerCase();
    if (!email) {
      errors.push("email cannot be empty");
    } else if (!EMAIL_REGEX.test(email)) {
      errors.push("email must be a valid email address");
    } else {
      payload.email = email;
    }
  }

  if (body?.displayName !== undefined) {
    const displayName = normalizeString(body.displayName);
    if (displayName.length > 120) {
      errors.push("displayName must be at most 120 characters");
    } else {
      payload.displayName = displayName;
    }
  }

  if (body?.roles !== undefined) {
    const roles = normalizeRoles(body.roles);
    if (!roles) {
      errors.push("roles must be an array of strings");
    } else if (roles.length === 0) {
      errors.push("roles cannot be empty");
    } else if (roles.some((role) => !USER_ROLES.has(role))) {
      errors.push("roles contain unsupported values");
    } else {
      payload.roles = roles;
    }
  }

  if (body?.status !== undefined) {
    const status = normalizeString(body.status).toLowerCase();
    if (!USER_STATUS.has(status)) {
      errors.push("status must be either active or disabled");
    } else {
      payload.status = status;
    }
  }

  return { payload, errors };
};
