import Joi from "joi";

const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUSES = ["open", "in-progress", "waiting-user", "resolved", "closed"];
const CHANNELS = ["web", "email", "chatbot", "api"];
const VISIBILITY_VALUES = ["public", "internal"];

const VALIDATION_OPTIONS = {
  abortEarly: false,
  convert: true,
  stripUnknown: true
};

const normalizeString = (value) => String(value ?? "").trim();
const normalizeSource = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const toErrors = (error) => {
  if (!error) return [];
  return error.details.map((detail) => detail.message.replace(/"/g, ""));
};

const normalizeTags = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((tag) => normalizeString(tag).toLowerCase()).filter(Boolean))];
  }

  if (typeof value === "string") {
    return [...new Set(value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
  }

  return [];
};

const createTicketSchema = Joi.object({
  subject: Joi.string().trim().required().max(200).messages({
    "any.required": "subject is required",
    "string.empty": "subject is required",
    "string.max": "subject must be at most 200 characters"
  }),
  description: Joi.string().trim().allow("").max(4000).default("").messages({
    "string.max": "description must be at most 4000 characters"
  }),
  priority: Joi.string().trim().lowercase().valid(...PRIORITIES).default("medium").messages({
    "any.only": "priority must be one of: low, medium, high, urgent"
  }),
  channel: Joi.string().trim().lowercase().valid(...CHANNELS).default("web").messages({
    "any.only": "channel must be one of: web, email, chatbot, api"
  })
});

const createSupportMessageSchema = Joi.object({
  content: Joi.string().trim().required().max(5000).messages({
    "any.required": "content is required",
    "string.empty": "content is required",
    "string.max": "content must be at most 5000 characters"
  }),
  senderDisplayName: Joi.string().trim().allow("").max(120).default("").messages({
    "string.max": "senderDisplayName must be at most 120 characters"
  }),
  visibility: Joi.string().trim().lowercase().valid(...VISIBILITY_VALUES).default("public").messages({
    "any.only": "visibility must be one of: public, internal"
  }),
  attachments: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().trim().allow("").max(255).default(""),
        url: Joi.string().trim().uri().allow("").default(""),
        contentType: Joi.string().trim().allow("").max(120).default(""),
        size: Joi.number().integer().min(0).default(0)
      })
    )
    .default([])
});

const updateTicketSchema = Joi.object({
  subject: Joi.string().trim().allow("").max(200).optional().messages({
    "string.max": "subject must be at most 200 characters"
  }),
  description: Joi.string().trim().allow("").max(4000).optional().messages({
    "string.max": "description must be at most 4000 characters"
  }),
  priority: Joi.string().trim().lowercase().valid(...PRIORITIES).optional().messages({
    "any.only": "priority must be one of: low, medium, high, urgent"
  }),
  status: Joi.string().trim().lowercase().valid(...STATUSES).optional().messages({
    "any.only": "status must be one of: open, in-progress, waiting-user, resolved, closed"
  }),
  assignedToUid: Joi.string().trim().allow("").max(180).optional().messages({
    "string.max": "assignedToUid must be at most 180 characters"
  })
});

const listQuerySchema = Joi.object({
  scope: Joi.string().trim().lowercase().valid("own", "all").default("own"),
  status: Joi.string().trim().lowercase().valid(...STATUSES).allow("").default(""),
  limit: Joi.number().integer().min(1).max(100).default(50)
});

const listMessagesQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(100)
});

export const validateCreateSupportTicketPayload = (body) => {
  const source = normalizeSource(body);
  const { value, error } = createTicketSchema.validate(source, VALIDATION_OPTIONS);

  return {
    errors: toErrors(error),
    payload: {
      subject: value?.subject || "",
      description: value?.description || "",
      priority: value?.priority || "medium",
      channel: value?.channel || "web",
      tags: normalizeTags(source.tags)
    }
  };
};

export const validateCreateSupportMessagePayload = (body) => {
  const source = normalizeSource(body);
  const { value, error } = createSupportMessageSchema.validate(source, VALIDATION_OPTIONS);

  return {
    errors: toErrors(error),
    payload: {
      content: value?.content || "",
      senderDisplayName: value?.senderDisplayName || "",
      visibility: value?.visibility || "public",
      attachments: value?.attachments || []
    }
  };
};

export const buildSupportTicketUpdatePayload = (body) => {
  const source = normalizeSource(body);
  const { value, error } = updateTicketSchema.validate(source, VALIDATION_OPTIONS);
  const payload = {};

  if (value?.subject !== undefined) {
    payload.subject = normalizeString(value.subject);
  }
  if (value?.description !== undefined) {
    payload.description = normalizeString(value.description);
  }
  if (value?.priority !== undefined) {
    payload.priority = value.priority;
  }
  if (value?.status !== undefined) {
    payload.status = value.status;
  }
  if (value?.assignedToUid !== undefined) {
    payload.assignedToUid = value.assignedToUid;
  }
  if (source.tags !== undefined) {
    payload.tags = normalizeTags(source.tags);
  }

  return {
    errors: toErrors(error),
    payload
  };
};

export const validateSupportTicketListQuery = (query) => {
  const source = normalizeSource(query);
  const { value, error } = listQuerySchema.validate(source, VALIDATION_OPTIONS);

  return {
    errors: toErrors(error),
    payload: {
      scope: value?.scope || "own",
      status: value?.status || "",
      limit: value?.limit || 50
    }
  };
};

export const validateSupportMessagesListQuery = (query) => {
  const source = normalizeSource(query);
  const { value, error } = listMessagesQuerySchema.validate(source, VALIDATION_OPTIONS);

  return {
    errors: toErrors(error),
    payload: {
      limit: value?.limit || 100
    }
  };
};
