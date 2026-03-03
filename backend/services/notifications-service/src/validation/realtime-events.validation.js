import Joi from "joi";

const toErrors = (error) => {
  if (!error) return [];
  return error.details.map((detail) => detail.message.replace(/"/g, ""));
};

const actorSchema = Joi.object({
  uid: Joi.string().trim().allow("").max(180).default(""),
  email: Joi.string().trim().allow("").lowercase().email({ tlds: { allow: false } }).default(""),
  roles: Joi.array().items(Joi.string().trim().lowercase().max(80)).default([])
}).default({});

const audienceSchema = Joi.object({
  userIds: Joi.array().items(Joi.string().trim().lowercase().max(180)).default([]),
  roles: Joi.array().items(Joi.string().trim().lowercase().max(80)).default([])
}).default({});

const publishSchema = Joi.object({
  eventType: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9][a-z0-9._-]{2,79}$/)
    .required()
    .messages({
      "any.required": "eventType is required",
      "string.empty": "eventType is required",
      "string.pattern.base":
        "eventType must be 3-80 characters and contain only lowercase letters, digits, dots, underscores, or hyphens"
    }),
  topic: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9][a-z0-9._-]{1,59}$/)
    .default("notifications")
    .messages({
      "string.pattern.base":
        "topic must be 2-60 characters and contain only lowercase letters, digits, dots, underscores, or hyphens"
    }),
  sourceService: Joi.string().trim().lowercase().allow("").max(100).default("notifications-service"),
  actor: actorSchema,
  audience: audienceSchema,
  payload: Joi.object().unknown(true).default({})
});

const streamQuerySchema = Joi.object({
  scope: Joi.string().trim().lowercase().valid("me", "all").default("me").messages({
    "any.only": "scope must be one of: me, all"
  }),
  types: Joi.string().trim().allow("").max(500).default(""),
  topics: Joi.string().trim().allow("").max(500).default("")
});

export const validateRealtimePublishPayload = (body) => {
  const source = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const { value, error } = publishSchema.validate(source, {
    abortEarly: false,
    convert: true,
    stripUnknown: true
  });

  return {
    errors: toErrors(error),
    payload: value || {}
  };
};

export const validateRealtimeStreamQuery = (query) => {
  const source = query && typeof query === "object" ? query : {};
  const { value, error } = streamQuerySchema.validate(source, {
    abortEarly: false,
    convert: true,
    stripUnknown: true
  });

  return {
    errors: toErrors(error),
    payload: value || { scope: "me", types: "", topics: "" }
  };
};
