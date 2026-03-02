import Joi from "joi";

const CHAT_CHANNELS = ["web", "whatsapp", "telegram", "api"];
const CHAT_STATUSES = ["active", "closed", "escalated"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

const VALIDATION_OPTIONS = {
  abortEarly: false,
  convert: true,
  stripUnknown: true
};

const normalizeSource = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const toErrors = (error) => {
  if (!error) return [];
  return error.details.map((detail) => detail.message.replace(/"/g, ""));
};

const createSessionSchema = Joi.object({
  channel: Joi.string().trim().lowercase().valid(...CHAT_CHANNELS).default("web").messages({
    "any.only": "channel must be one of: web, whatsapp, telegram, api"
  }),
  reuseActive: Joi.boolean().default(true),
  context: Joi.object().unknown(true).default({})
});

const postChatMessageSchema = Joi.object({
  message: Joi.string().trim().required().max(5000).messages({
    "any.required": "message is required",
    "string.empty": "message is required",
    "string.max": "message must be at most 5000 characters"
  }),
  includeCitations: Joi.boolean().default(true)
});

const listSessionsQuerySchema = Joi.object({
  scope: Joi.string().trim().lowercase().valid("own", "all").default("own"),
  status: Joi.string().trim().lowercase().valid(...CHAT_STATUSES).allow("").default(""),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

const listMessagesQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(100)
});

const escalateSessionSchema = Joi.object({
  subject: Joi.string().trim().allow("").max(200).default(""),
  summary: Joi.string().trim().allow("").max(3000).default(""),
  priority: Joi.string().trim().lowercase().valid(...PRIORITIES).default("medium").messages({
    "any.only": "priority must be one of: low, medium, high, urgent"
  })
});

export const validateCreateChatSessionPayload = (body) => {
  const source = normalizeSource(body);
  const { value, error } = createSessionSchema.validate(source, VALIDATION_OPTIONS);

  return {
    errors: toErrors(error),
    payload: {
      channel: value?.channel || "web",
      reuseActive: value?.reuseActive !== false,
      context: value?.context || {}
    }
  };
};

export const validatePostChatMessagePayload = (body) => {
  const source = normalizeSource(body);
  const { value, error } = postChatMessageSchema.validate(source, VALIDATION_OPTIONS);

  return {
    errors: toErrors(error),
    payload: {
      message: value?.message || "",
      includeCitations: value?.includeCitations !== false
    }
  };
};

export const validateChatSessionsListQuery = (query) => {
  const source = normalizeSource(query);
  const { value, error } = listSessionsQuerySchema.validate(source, VALIDATION_OPTIONS);

  return {
    errors: toErrors(error),
    payload: {
      scope: value?.scope || "own",
      status: value?.status || "",
      limit: value?.limit || 20
    }
  };
};

export const validateChatMessagesListQuery = (query) => {
  const source = normalizeSource(query);
  const { value, error } = listMessagesQuerySchema.validate(source, VALIDATION_OPTIONS);

  return {
    errors: toErrors(error),
    payload: {
      limit: value?.limit || 100
    }
  };
};

export const validateEscalateChatSessionPayload = (body) => {
  const source = normalizeSource(body);
  const { value, error } = escalateSessionSchema.validate(source, VALIDATION_OPTIONS);

  return {
    errors: toErrors(error),
    payload: {
      subject: value?.subject || "",
      summary: value?.summary || "",
      priority: value?.priority || "medium"
    }
  };
};
