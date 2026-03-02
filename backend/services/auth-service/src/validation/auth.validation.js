import Joi from "joi";

const PURPOSES = [
  "login",
  "client-login",
  "admin-login",
  "signup",
  "admin-setup",
  "password-reset",
  "sms-verification",
  "onboarding"
];
const ACCOUNT_ROLES = ["client", "admin", "accountant", "manager", "owner", "superadmin"];
const ACCOUNT_STATUSES = ["active", "disabled", "suspended", "pending"];
const AUTH_PROVIDERS = ["email-password", "google", "otp", "invite", "sso"];
const LOGIN_METHODS = ["password", "otp", "google", "token", "invite"];

const PURPOSES_TEXT = PURPOSES.join(", ");
const ACCOUNT_ROLES_TEXT = ACCOUNT_ROLES.join(", ");
const ACCOUNT_STATUSES_TEXT = ACCOUNT_STATUSES.join(", ");
const AUTH_PROVIDERS_TEXT = AUTH_PROVIDERS.join(", ");
const LOGIN_METHODS_TEXT = LOGIN_METHODS.join(", ");

const VALIDATION_OPTIONS = {
  abortEarly: false,
  convert: true,
  stripUnknown: true
};

const normalizeSource = (body) =>
  body && typeof body === "object" && !Array.isArray(body) ? body : {};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  }
  return fallback;
};

const toErrors = (error) => {
  if (!error) {
    return [];
  }

  return error.details.map((detail) => detail.message.replace(/"/g, ""));
};

const requiredEmailSchema = Joi.string()
  .trim()
  .lowercase()
  .email({ tlds: { allow: false } })
  .required()
  .messages({
    "any.required": "email is required",
    "string.empty": "email is required",
    "string.email": "email must be a valid email address"
  });

const optionalEmailSchema = Joi.string()
  .trim()
  .lowercase()
  .allow("")
  .email({ tlds: { allow: false } })
  .default("")
  .messages({
    "string.email": "email must be a valid email address"
  });

const sendOtpSchema = Joi.object({
  email: requiredEmailSchema,
  purpose: Joi.string().trim().lowercase().valid(...PURPOSES).default("login").messages({
    "any.only": `purpose must be one of: ${PURPOSES_TEXT}`,
    "string.base": `purpose must be one of: ${PURPOSES_TEXT}`,
    "string.empty": `purpose must be one of: ${PURPOSES_TEXT}`
  })
});

const verifyOtpSchema = Joi.object({
  email: requiredEmailSchema,
  purpose: Joi.string().trim().lowercase().valid(...PURPOSES).default("login").messages({
    "any.only": `purpose must be one of: ${PURPOSES_TEXT}`,
    "string.base": `purpose must be one of: ${PURPOSES_TEXT}`,
    "string.empty": `purpose must be one of: ${PURPOSES_TEXT}`
  }),
  otp: Joi.string().trim().required().pattern(/^\d{4,8}$/).messages({
    "any.required": "otp is required",
    "string.empty": "otp is required",
    "string.pattern.base": "otp must be 4 to 8 digits"
  })
});

const verifyTokenSchema = Joi.object({
  idToken: Joi.string().trim().required().min(20).messages({
    "any.required": "idToken is required",
    "string.empty": "idToken is required",
    "string.min": "idToken format appears invalid"
  })
});

const registerAccountSchema = Joi.object({
  uid: Joi.string().trim().allow("").max(180).default("").messages({
    "string.max": "uid must be at most 180 characters"
  }),
  email: requiredEmailSchema,
  fullName: Joi.string().trim().allow("").max(140).default("").messages({
    "string.max": "fullName must be at most 140 characters"
  }),
  role: Joi.string().trim().lowercase().valid(...ACCOUNT_ROLES).default("client").messages({
    "any.only": `role must be one of: ${ACCOUNT_ROLES_TEXT}`,
    "string.empty": `role must be one of: ${ACCOUNT_ROLES_TEXT}`
  }),
  status: Joi.string().trim().lowercase().valid(...ACCOUNT_STATUSES).default("active").messages({
    "any.only": `status must be one of: ${ACCOUNT_STATUSES_TEXT}`,
    "string.empty": `status must be one of: ${ACCOUNT_STATUSES_TEXT}`
  }),
  provider: Joi.string().trim().lowercase().valid(...AUTH_PROVIDERS).default("email-password").messages({
    "any.only": `provider must be one of: ${AUTH_PROVIDERS_TEXT}`,
    "string.empty": `provider must be one of: ${AUTH_PROVIDERS_TEXT}`
  }),
  emailVerified: Joi.boolean().default(false),
  phoneVerified: Joi.boolean().default(false)
});

const loginSessionSchema = Joi.object({
  uid: Joi.string().trim().allow("").max(180).default("").messages({
    "string.max": "uid must be at most 180 characters"
  }),
  email: optionalEmailSchema,
  role: Joi.string().trim().lowercase().valid(...ACCOUNT_ROLES).default("client").messages({
    "any.only": `role must be one of: ${ACCOUNT_ROLES_TEXT}`,
    "string.empty": `role must be one of: ${ACCOUNT_ROLES_TEXT}`
  }),
  loginMethod: Joi.string().trim().lowercase().valid(...LOGIN_METHODS).default("token").messages({
    "any.only": `loginMethod must be one of: ${LOGIN_METHODS_TEXT}`,
    "string.empty": `loginMethod must be one of: ${LOGIN_METHODS_TEXT}`
  }),
  sessionTtlMinutes: Joi.number().integer().min(5).max(10080).default(60).messages({
    "number.base": "sessionTtlMinutes must be between 5 and 10080",
    "number.integer": "sessionTtlMinutes must be between 5 and 10080",
    "number.min": "sessionTtlMinutes must be between 5 and 10080",
    "number.max": "sessionTtlMinutes must be between 5 and 10080"
  }),
  ipAddress: Joi.string().trim().allow("").max(90).default("").messages({
    "string.max": "ipAddress must be at most 90 characters"
  }),
  userAgent: Joi.string().trim().allow("").max(500).default("").messages({
    "string.max": "userAgent must be at most 500 characters"
  }),
  deviceFingerprint: Joi.string().trim().allow("").max(200).default("").messages({
    "string.max": "deviceFingerprint must be at most 200 characters"
  }),
  mfaCompleted: Joi.boolean().default(false),
  tokenHash: Joi.string().trim().allow("").max(300).default("").messages({
    "string.max": "tokenHash must be at most 300 characters"
  })
})
  .custom((value, helpers) => {
    if (!value.uid && !value.email) {
      return helpers.error("any.custom", {
        message: "At least one of uid or email is required"
      });
    }
    return value;
  })
  .messages({
    "any.custom": "{{#message}}"
  });

export const validateSendOtpPayload = (body) => {
  const source = normalizeSource(body);
  const { value, error } = sendOtpSchema.validate(source, VALIDATION_OPTIONS);

  return {
    errors: toErrors(error),
    payload: {
      email: value?.email || "",
      purpose: value?.purpose || "login"
    }
  };
};

export const validateVerifyOtpPayload = (body) => {
  const source = normalizeSource(body);
  const { value, error } = verifyOtpSchema.validate(source, VALIDATION_OPTIONS);

  return {
    errors: toErrors(error),
    payload: {
      email: value?.email || "",
      purpose: value?.purpose || "login",
      otp: value?.otp || ""
    }
  };
};

export const validateVerifyTokenPayload = (body) => {
  const source = normalizeSource(body);
  const { value, error } = verifyTokenSchema.validate(source, VALIDATION_OPTIONS);

  if (error) {
    return {
      error: toErrors(error)[0] || "idToken is required"
    };
  }

  return {
    idToken: value.idToken
  };
};

export const validateRegisterAccountPayload = (body) => {
  const source = normalizeSource(body);
  const { value, error } = registerAccountSchema.validate(
    {
      ...source,
      fullName: source.fullName ?? source.displayName,
      emailVerified: normalizeBoolean(source.emailVerified, false),
      phoneVerified: normalizeBoolean(source.phoneVerified, false)
    },
    VALIDATION_OPTIONS
  );

  return {
    errors: toErrors(error),
    payload: {
      uid: value?.uid || "",
      email: value?.email || "",
      fullName: value?.fullName || "",
      role: value?.role || "client",
      status: value?.status || "active",
      provider: value?.provider || "email-password",
      emailVerified: Boolean(value?.emailVerified),
      phoneVerified: Boolean(value?.phoneVerified)
    }
  };
};

export const validateLoginSessionPayload = (body) => {
  const source = normalizeSource(body);
  const rawTtl = Number(source.sessionTtlMinutes);
  const normalizedTtl = Number.isFinite(rawTtl) ? Math.round(rawTtl) : undefined;

  const { value, error } = loginSessionSchema.validate(
    {
      ...source,
      sessionTtlMinutes: normalizedTtl,
      mfaCompleted: normalizeBoolean(source.mfaCompleted, false)
    },
    VALIDATION_OPTIONS
  );

  return {
    errors: toErrors(error),
    payload: {
      uid: value?.uid || "",
      email: value?.email || "",
      role: value?.role || "client",
      loginMethod: value?.loginMethod || "token",
      sessionTtlMinutes: value?.sessionTtlMinutes || 60,
      ipAddress: value?.ipAddress || "",
      userAgent: value?.userAgent || "",
      deviceFingerprint: value?.deviceFingerprint || "",
      mfaCompleted: Boolean(value?.mfaCompleted),
      tokenHash: value?.tokenHash || ""
    }
  };
};
