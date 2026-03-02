import Joi from "joi";

const USER_STATUS_VALUES = ["active", "disabled", "suspended"];
const USER_ROLE_VALUES = [
  "client",
  "admin",
  "accountant",
  "manager",
  "owner",
  "superadmin"
];
const BUSINESS_TYPE_VALUES = ["individual", "business", "non-profit"];
const DASHBOARD_PAGE_IDS = [
  "dashboard",
  "expenses",
  "sales",
  "bank-statements",
  "upload-history",
  "recent-activities",
  "support",
  "settings"
];
const ADMIN_DASHBOARD_PAGE_IDS = [
  "admin-dashboard",
  "users",
  "documents",
  "support-leads",
  "newsletters",
  "analytics",
  "settings"
];
const SUPPORT_LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "closed"];
const NEWSLETTER_STATUSES = ["subscribed", "unsubscribed", "bounced"];
const LANGUAGE_VALUES = ["english", "french"];

const CAC_PREFIX_REGEX = /^(RC|BN|IT|LP|LLP)/i;

const MONTH_NAME_LOOKUP = Object.freeze({
  january: "01",
  jan: "01",
  february: "02",
  feb: "02",
  march: "03",
  mar: "03",
  april: "04",
  apr: "04",
  may: "05",
  june: "06",
  jun: "06",
  july: "07",
  jul: "07",
  august: "08",
  aug: "08",
  september: "09",
  sep: "09",
  sept: "09",
  october: "10",
  oct: "10",
  november: "11",
  nov: "11",
  december: "12",
  dec: "12"
});

const EMAIL_SCHEMA = Joi.string()
  .trim()
  .lowercase()
  .email({ tlds: { allow: false } });
const DISPLAY_NAME_SCHEMA = Joi.string().allow("").max(120);
const USER_STATUS_SCHEMA = Joi.string().valid(...USER_STATUS_VALUES);
const USER_ROLE_SCHEMA = Joi.string().valid(...USER_ROLE_VALUES);
const BUSINESS_TYPE_SCHEMA = Joi.string().valid(...BUSINESS_TYPE_VALUES);
const DASHBOARD_PAGE_SCHEMA = Joi.string().valid(...DASHBOARD_PAGE_IDS);
const ADMIN_DASHBOARD_PAGE_SCHEMA = Joi.string().valid(...ADMIN_DASHBOARD_PAGE_IDS);
const LANGUAGE_SCHEMA = Joi.string().valid(...LANGUAGE_VALUES);
const LETTERS_ONLY_NAME_SCHEMA = Joi.string().pattern(/^[A-Za-z\s]+$/);
const PHONE_COUNTRY_CODE_SCHEMA = Joi.string().pattern(/^\+\d{1,4}$/);
const ISO_CURRENCY_SCHEMA = Joi.string().pattern(/^[A-Z]{3}$/);

const normalizeString = (value) => String(value ?? "").trim();
const normalizeSource = (body) =>
  body && typeof body === "object" && !Array.isArray(body) ? body : {};

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

const sanitizeDigitsOnly = (value) => normalizeString(value).replace(/\D/g, "");

const sanitizeAlphaNumeric = (value) =>
  normalizeString(value).replace(/[^A-Za-z0-9]/g, "").toUpperCase();

const toTitleCaseWords = (value = "") =>
  normalizeString(value)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const normalizeLettersOnlyName = (value) => {
  const normalized = normalizeString(value);
  if (!normalized) return "";
  if (LETTERS_ONLY_NAME_SCHEMA.validate(normalized).error) return null;
  return toTitleCaseWords(normalized);
};

const normalizeBusinessType = (value) => {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return "";
  if (normalized === "nonprofit") return "non-profit";
  return BUSINESS_TYPE_SCHEMA.validate(normalized).error ? null : normalized;
};

const normalizeLanguage = (value) => {
  const normalized = normalizeString(value);
  if (!normalized) return "";
  const lowered = normalized.toLowerCase();
  if (LANGUAGE_SCHEMA.validate(lowered).error) return null;
  return lowered === "english" ? "English" : "French";
};

const normalizeFinancialMonth = (value) => {
  const raw = normalizeString(value);
  if (!raw) return "";

  const canonicalMatch = raw.match(/^(\d{1,2})(?:-(?:\d{2}|LAST))?$/i);
  if (canonicalMatch) {
    const month = Number(canonicalMatch[1]);
    if (month >= 1 && month <= 12) return String(month).padStart(2, "0");
  }

  const isoMatch = raw.match(/^\d{4}-(\d{2})-\d{2}$/);
  if (isoMatch) {
    const month = Number(isoMatch[1]);
    if (month >= 1 && month <= 12) return String(month).padStart(2, "0");
  }

  const words = raw.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  for (const word of words) {
    if (MONTH_NAME_LOOKUP[word]) {
      return MONTH_NAME_LOOKUP[word];
    }
  }

  return null;
};

const VALIDATION_OPTIONS = {
  abortEarly: false,
  convert: true,
  stripUnknown: true
};

const ADMIN_PROFILE_INPUT_SCHEMA = Joi.object({
  firstName: Joi.string().trim().allow("").max(120).default(""),
  lastName: Joi.string().trim().allow("").max(120).default(""),
  displayName: Joi.string().trim().allow("").max(140).default(""),
  jobTitle: Joi.string().trim().allow("").max(140).default(""),
  department: Joi.string().trim().allow("").max(140).default(""),
  phone: Joi.string().trim().allow("").max(40).default(""),
  timezone: Joi.string().trim().allow("").max(90).default("Africa/Lagos")
});

const SUPPORT_LEAD_INPUT_SCHEMA = Joi.object({
  leadId: Joi.string().trim().allow("").max(120).default(""),
  fullName: Joi.string().trim().allow("").max(140).default(""),
  email: Joi.string()
    .trim()
    .lowercase()
    .allow("")
    .email({ tlds: { allow: false } })
    .default(""),
  companyName: Joi.string().trim().allow("").max(180).default(""),
  phone: Joi.string().trim().allow("").max(40).default(""),
  source: Joi.string().trim().allow("").max(90).default("support-form"),
  status: Joi.string().trim().lowercase().valid(...SUPPORT_LEAD_STATUSES).default("new"),
  interest: Joi.string().trim().allow("").max(180).default(""),
  assignedToUid: Joi.string().trim().allow("").max(180).default(""),
  notes: Joi.string().trim().allow("").max(1500).default(""),
  createdAt: Joi.date().iso().optional(),
  updatedAt: Joi.date().iso().optional()
});

const NEWSLETTER_INPUT_SCHEMA = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .allow("")
    .email({ tlds: { allow: false } })
    .default(""),
  fullName: Joi.string().trim().allow("").max(140).default(""),
  status: Joi.string().trim().lowercase().valid(...NEWSLETTER_STATUSES).default("subscribed"),
  source: Joi.string().trim().allow("").max(90).default("website"),
  tags: Joi.array().items(Joi.string().trim().max(60)).default([]),
  subscribedAt: Joi.date().iso().optional(),
  lastEngagedAt: Joi.date().iso().allow(null).optional()
});

const parseDashboardCollection = ({
  source,
  key,
  itemSchema,
  normalizeItem,
  invalidTypeMessage,
  invalidItemMessage,
  errors
}) => {
  if (source[key] === undefined) {
    return null;
  }

  if (!Array.isArray(source[key])) {
    errors.push(invalidTypeMessage);
    return null;
  }

  const values = [];
  let hasItemErrors = false;
  source[key].forEach((item, index) => {
    const { value, error } = itemSchema.validate(item ?? {}, VALIDATION_OPTIONS);
    if (error) {
      errors.push(`${invalidItemMessage} at index ${index}`);
      hasItemErrors = true;
      return;
    }

    values.push(normalizeItem(value));
  });

  return hasItemErrors ? null : values;
};

export const validateSyncFromAuthPayload = (body) => {
  const source = normalizeSource(body);

  const uid = normalizeString(source.uid);
  const email = normalizeString(source.email).toLowerCase();
  const displayName = source.displayName === undefined ? "" : normalizeString(source.displayName);
  const errors = [];

  if (!uid) {
    errors.push("uid is required");
  }

  if (!email) {
    errors.push("email is required");
  } else if (EMAIL_SCHEMA.validate(email).error) {
    errors.push("email must be a valid email address");
  }

  if (DISPLAY_NAME_SCHEMA.validate(displayName).error) {
    errors.push("displayName must be at most 120 characters");
  }

  let roles;
  if (source.roles !== undefined) {
    if (Joi.array().validate(source.roles).error) {
      errors.push("roles must be an array of strings");
    } else {
      roles = normalizeRoles(source.roles);
      if (roles === null) {
        errors.push("roles must be an array of strings");
      } else if (roles.some((role) => USER_ROLE_SCHEMA.validate(role).error)) {
        errors.push("roles contain unsupported values");
      }
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
  const source = normalizeSource(body);
  const payload = {};
  const errors = [];

  if (source.email !== undefined) {
    const email = normalizeString(source.email).toLowerCase();
    if (!email) {
      errors.push("email cannot be empty");
    } else if (EMAIL_SCHEMA.validate(email).error) {
      errors.push("email must be a valid email address");
    } else {
      payload.email = email;
    }
  }

  if (source.displayName !== undefined) {
    const displayName = normalizeString(source.displayName);
    if (DISPLAY_NAME_SCHEMA.validate(displayName).error) {
      errors.push("displayName must be at most 120 characters");
    } else {
      payload.displayName = displayName;
    }
  }

  if (source.roles !== undefined) {
    if (Joi.array().validate(source.roles).error) {
      errors.push("roles must be an array of strings");
    } else {
      const roles = normalizeRoles(source.roles);
      if (!roles) {
        errors.push("roles must be an array of strings");
      } else if (roles.length === 0) {
        errors.push("roles cannot be empty");
      } else if (roles.some((role) => USER_ROLE_SCHEMA.validate(role).error)) {
        errors.push("roles contain unsupported values");
      } else {
        payload.roles = roles;
      }
    }
  }

  if (source.status !== undefined) {
    const status = normalizeString(source.status).toLowerCase();
    if (USER_STATUS_SCHEMA.validate(status).error) {
      errors.push("status must be one of: active, disabled, suspended");
    } else {
      payload.status = status;
    }
  }

  return { payload, errors };
};

export const buildClientProfileUpdatePayload = (body) => {
  const source = normalizeSource(body);
  const payload = {};
  const errors = [];

  const assignIfPresent = (inputField, targetPath, normalizer = (value) => normalizeString(value)) => {
    if (source[inputField] === undefined) return;
    const normalizedValue = normalizer(source[inputField]);
    if (normalizedValue === null) return;
    payload[targetPath] = normalizedValue;
  };

  if (source.firstName !== undefined) {
    const firstName = normalizeLettersOnlyName(source.firstName);
    if (firstName === null) {
      errors.push("firstName must contain letters only");
    } else {
      payload["clientProfile.firstName"] = firstName;
    }
  }

  if (source.lastName !== undefined) {
    const lastName = normalizeLettersOnlyName(source.lastName);
    if (lastName === null) {
      errors.push("lastName must contain letters only");
    } else {
      payload["clientProfile.lastName"] = lastName;
    }
  }

  if (source.otherNames !== undefined) {
    const otherNames = normalizeLettersOnlyName(source.otherNames);
    if (otherNames === null) {
      errors.push("otherNames must contain letters only");
    } else {
      payload["clientProfile.otherNames"] = otherNames;
    }
  }

  if (source.phoneCountryCode !== undefined) {
    const phoneCode = normalizeString(source.phoneCountryCode);
    if (phoneCode && PHONE_COUNTRY_CODE_SCHEMA.validate(phoneCode).error) {
      errors.push("phoneCountryCode must be in format +<digits>");
    } else {
      payload["clientProfile.phoneCountryCode"] = phoneCode || "+234";
    }
  }

  if (source.phoneLocalNumber !== undefined) {
    const rawPhone = normalizeString(source.phoneLocalNumber);
    const normalizedPhone = sanitizeDigitsOnly(rawPhone);
    if (rawPhone && !normalizedPhone) {
      errors.push("phoneLocalNumber must contain digits only");
    } else {
      payload["clientProfile.phoneLocalNumber"] = normalizedPhone;
    }
  }

  if (source.phone !== undefined && source.phoneLocalNumber === undefined) {
    const rawPhone = normalizeString(source.phone);
    const normalizedPhone = sanitizeDigitsOnly(rawPhone);
    if (rawPhone && !normalizedPhone) {
      errors.push("phone must contain digits only");
    } else {
      payload["clientProfile.phoneLocalNumber"] = normalizedPhone;
    }
  }

  assignIfPresent("roleInCompany", "clientProfile.roleInCompany");
  assignIfPresent("address1", "clientProfile.address1");
  assignIfPresent("address2", "clientProfile.address2");
  assignIfPresent("city", "clientProfile.city");
  assignIfPresent("postalCode", "clientProfile.postalCode");
  assignIfPresent("addressCountry", "clientProfile.addressCountry");

  if (source.language !== undefined) {
    const language = normalizeLanguage(source.language);
    if (language === null) {
      errors.push("language must be one of: English, French");
    } else {
      payload["clientProfile.language"] = language || "English";
    }
  }

  if (source.businessType !== undefined) {
    const businessType = normalizeBusinessType(source.businessType);
    if (businessType === null) {
      errors.push("businessType must be one of: individual, business, non-profit");
    } else {
      payload["entityProfile.businessType"] = businessType;
    }
  }

  assignIfPresent("businessName", "entityProfile.businessName");
  assignIfPresent("country", "entityProfile.country");

  if (source.currency !== undefined) {
    const currency = normalizeString(source.currency).toUpperCase();
    if (currency && ISO_CURRENCY_SCHEMA.validate(currency).error) {
      errors.push("currency must be a 3-letter ISO code");
    } else {
      payload["entityProfile.currency"] = currency;
    }
  }

  assignIfPresent("industry", "entityProfile.industry");
  assignIfPresent("industryOther", "entityProfile.industryOther");

  if (source.cacNumber !== undefined) {
    const cacNumber = sanitizeAlphaNumeric(source.cacNumber);
    const effectiveBusinessType =
      payload["entityProfile.businessType"] !== undefined
        ? payload["entityProfile.businessType"]
        : normalizeBusinessType(source.businessType) || "";
    if (cacNumber && (effectiveBusinessType === "business" || effectiveBusinessType === "non-profit")) {
      if (!CAC_PREFIX_REGEX.test(cacNumber)) {
        errors.push("cacNumber must start with RC, BN, IT, LP, or LLP");
      }
    }
    payload["entityProfile.cacNumber"] = cacNumber;
  }

  if (source.tin !== undefined) {
    const tin = sanitizeAlphaNumeric(source.tin);
    payload["entityProfile.tin"] = tin;
  }

  if (source.reportingCycle !== undefined) {
    const reportingCycle = normalizeString(source.reportingCycle);
    const month = normalizeFinancialMonth(reportingCycle);
    if (month === null) {
      errors.push("reportingCycle must include a valid month");
    } else {
      payload["entityProfile.reportingCycle"] = reportingCycle;
      payload["entityProfile.financialYearEndMonth"] = month;
    }
  }

  if (source.startMonth !== undefined) {
    const startMonth = normalizeString(source.startMonth);
    const month = normalizeFinancialMonth(startMonth);
    if (month === null) {
      errors.push("startMonth must include a valid month");
    } else {
      payload["entityProfile.startMonth"] = startMonth;
      payload["entityProfile.financialYearStartMonth"] = month;
    }
  }

  return { payload, errors };
};

export const buildClientDashboardUpdatePayload = (body) => {
  const source = normalizeSource(body);
  const payload = {};
  const errors = [];

  if (source.defaultLandingPage !== undefined) {
    const pageId = normalizeString(source.defaultLandingPage).toLowerCase();
    if (DASHBOARD_PAGE_SCHEMA.validate(pageId).error) {
      errors.push(
        "defaultLandingPage must be one of: dashboard, expenses, sales, bank-statements, upload-history, recent-activities, support, settings"
      );
    } else {
      payload["clientDashboard.defaultLandingPage"] = pageId;
      payload["clientDashboard.lastVisitedPage"] = pageId;
    }
  }

  if (source.lastVisitedPage !== undefined) {
    const pageId = normalizeString(source.lastVisitedPage).toLowerCase();
    if (DASHBOARD_PAGE_SCHEMA.validate(pageId).error) {
      errors.push(
        "lastVisitedPage must be one of: dashboard, expenses, sales, bank-statements, upload-history, recent-activities, support, settings"
      );
    } else {
      payload["clientDashboard.lastVisitedPage"] = pageId;
    }
  }

  if (source.showGreeting !== undefined) {
    payload["clientDashboard.showGreeting"] = Boolean(source.showGreeting);
  }

  if (source.compactMode !== undefined) {
    payload["clientDashboard.compactMode"] = Boolean(source.compactMode);
  }

  if (source.widgets !== undefined) {
    if (Joi.array().validate(source.widgets).error) {
      errors.push("widgets must be an array of strings");
    } else {
      payload["clientDashboard.widgets"] = [
        ...new Set(
          source.widgets
            .map((widget) => normalizeString(widget).toLowerCase())
            .filter(Boolean)
        )
      ];
    }
  }

  if (source.favoritePages !== undefined) {
    if (Joi.array().validate(source.favoritePages).error) {
      errors.push("favoritePages must be an array of strings");
    } else {
      const favoritePages = [
        ...new Set(
          source.favoritePages
            .map((page) => normalizeString(page).toLowerCase())
            .filter(Boolean)
        )
      ];

      const invalidPages = favoritePages.filter((page) => DASHBOARD_PAGE_SCHEMA.validate(page).error);
      if (invalidPages.length > 0) {
        errors.push("favoritePages contains unsupported page values");
      } else {
        payload["clientDashboard.favoritePages"] = favoritePages;
      }
    }
  }

  if (source.notificationPreferences !== undefined) {
    if (!source.notificationPreferences || typeof source.notificationPreferences !== "object") {
      errors.push("notificationPreferences must be an object");
    } else {
      const preferenceKeys = [
        "inAppEnabled",
        "soundEnabled",
        "documentApproved",
        "documentRejected",
        "documentInfoRequested",
        "verificationUpdates",
        "accountSuspended",
        "adminMessages",
        "emailNewUploads",
        "emailApprovals",
        "emailWeeklySummary",
        "emailSecurityAlerts"
      ];

      for (const key of preferenceKeys) {
        if (source.notificationPreferences[key] !== undefined) {
          payload[`notificationPreferences.${key}`] = Boolean(source.notificationPreferences[key]);
        }
      }
    }
  }

  return { payload, errors };
};

export const buildAdminDashboardUpdatePayload = (body) => {
  const source = normalizeSource(body);
  const payload = {};
  const errors = [];

  if (source.defaultLandingPage !== undefined) {
    const pageId = normalizeString(source.defaultLandingPage).toLowerCase();
    if (ADMIN_DASHBOARD_PAGE_SCHEMA.validate(pageId).error) {
      errors.push(
        "defaultLandingPage must be one of: admin-dashboard, users, documents, support-leads, newsletters, analytics, settings"
      );
    } else {
      payload["adminDashboard.defaultLandingPage"] = pageId;
      payload["adminDashboard.lastVisitedPage"] = pageId;
    }
  }

  if (source.lastVisitedPage !== undefined) {
    const pageId = normalizeString(source.lastVisitedPage).toLowerCase();
    if (ADMIN_DASHBOARD_PAGE_SCHEMA.validate(pageId).error) {
      errors.push(
        "lastVisitedPage must be one of: admin-dashboard, users, documents, support-leads, newsletters, analytics, settings"
      );
    } else {
      payload["adminDashboard.lastVisitedPage"] = pageId;
    }
  }

  if (source.compactMode !== undefined) {
    payload["adminDashboard.compactMode"] = Boolean(source.compactMode);
  }

  if (source.widgets !== undefined) {
    if (!Array.isArray(source.widgets)) {
      errors.push("widgets must be an array of strings");
    } else {
      payload["adminDashboard.widgets"] = [
        ...new Set(
          source.widgets
            .map((widget) => normalizeString(widget).toLowerCase())
            .filter(Boolean)
        )
      ];
    }
  }

  if (source.favoritePages !== undefined) {
    if (!Array.isArray(source.favoritePages)) {
      errors.push("favoritePages must be an array of strings");
    } else {
      const favoritePages = [
        ...new Set(
          source.favoritePages
            .map((page) => normalizeString(page).toLowerCase())
            .filter(Boolean)
        )
      ];

      const invalidPages = favoritePages.filter(
        (page) => ADMIN_DASHBOARD_PAGE_SCHEMA.validate(page).error
      );
      if (invalidPages.length > 0) {
        errors.push("favoritePages contains unsupported page values");
      } else {
        payload["adminDashboard.favoritePages"] = favoritePages;
      }
    }
  }

  if (source.adminProfile !== undefined) {
    if (!source.adminProfile || typeof source.adminProfile !== "object" || Array.isArray(source.adminProfile)) {
      errors.push("adminProfile must be an object");
    } else {
      const { value, error } = ADMIN_PROFILE_INPUT_SCHEMA.validate(source.adminProfile, VALIDATION_OPTIONS);
      if (error) {
        errors.push("adminProfile contains invalid values");
      } else {
        payload["adminProfile.firstName"] = value.firstName;
        payload["adminProfile.lastName"] = value.lastName;
        payload["adminProfile.displayName"] = value.displayName;
        payload["adminProfile.jobTitle"] = value.jobTitle;
        payload["adminProfile.department"] = value.department;
        payload["adminProfile.phone"] = value.phone;
        payload["adminProfile.timezone"] = value.timezone;
      }
    }
  }

  const supportLeads = parseDashboardCollection({
    source,
    key: "supportLeads",
    itemSchema: SUPPORT_LEAD_INPUT_SCHEMA,
    normalizeItem: (item) => ({
      ...item,
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
    }),
    invalidTypeMessage: "supportLeads must be an array of objects",
    invalidItemMessage: "supportLeads contains invalid value",
    errors
  });

  if (supportLeads) {
    payload["adminDashboard.supportLeads"] = supportLeads;
    payload["adminDashboard.stats.openSupportLeads"] = supportLeads.filter(
      (lead) => lead.status !== "closed" && lead.status !== "converted"
    ).length;
  }

  const newsletters = parseDashboardCollection({
    source,
    key: "newsletters",
    itemSchema: NEWSLETTER_INPUT_SCHEMA,
    normalizeItem: (item) => ({
      ...item,
      tags: [...new Set((item.tags || []).map((tag) => normalizeString(tag).toLowerCase()).filter(Boolean))],
      subscribedAt: item.subscribedAt ? new Date(item.subscribedAt) : new Date(),
      lastEngagedAt: item.lastEngagedAt ? new Date(item.lastEngagedAt) : null
    }),
    invalidTypeMessage: "newsletters must be an array of objects",
    invalidItemMessage: "newsletters contains invalid value",
    errors
  });

  if (newsletters) {
    payload["adminDashboard.newsletters"] = newsletters;
    payload["adminDashboard.stats.newsletterSubscribers"] = newsletters.filter(
      (entry) => entry.status === "subscribed"
    ).length;
    payload["adminDashboard.stats.newsletterUnsubscribed"] = newsletters.filter(
      (entry) => entry.status === "unsubscribed"
    ).length;
  }

  return { payload, errors };
};
