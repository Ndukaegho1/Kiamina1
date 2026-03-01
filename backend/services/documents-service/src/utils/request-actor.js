const PRIVILEGED_ROLES = new Set([
  "admin",
  "owner",
  "superadmin",
  "manager",
  "accountant"
]);

const parseRoles = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((role) => String(role).trim().toLowerCase())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((role) => role.trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
};

export const getRequestActor = (req) => {
  const uidHeader = req.headers["x-user-id"];
  const emailHeader = req.headers["x-user-email"];
  const rolesHeader = req.headers["x-user-roles"];

  return {
    uid: uidHeader ? String(uidHeader) : "",
    email: emailHeader ? String(emailHeader) : "",
    roles: parseRoles(rolesHeader)
  };
};

export const isPrivilegedActor = (actor) =>
  actor.roles.some((role) => PRIVILEGED_ROLES.has(role));
