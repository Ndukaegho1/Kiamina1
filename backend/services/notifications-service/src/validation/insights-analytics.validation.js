import Joi from "joi";

const EVENT_TYPES = [
  "site_visit",
  "page_view",
  "nav_click",
  "cta_click",
  "service_click",
  "article_open",
  "contact_submit",
  "newsletter_subscribe",
  "region_select"
];

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

const eventPayloadSchema = Joi.object({
  sessionId: Joi.string().trim().allow("").max(120).default(""),
  eventType: Joi.string().trim().lowercase().valid(...EVENT_TYPES).required().messages({
    "any.required": "eventType is required",
    "any.only":
      `eventType must be one of: ${EVENT_TYPES.join(", ")}`
  }),
  page: Joi.string().trim().allow("").max(80).default(""),
  targetType: Joi.string().trim().allow("").max(50).default(""),
  targetId: Joi.string().trim().allow("").max(160).default(""),
  targetLabel: Joi.string().trim().allow("").max(160).default(""),
  country: Joi.string().trim().allow("").max(60).default(""),
  metadata: Joi.object().unknown(true).default({})
});

const summaryQuerySchema = Joi.object({
  days: Joi.number().integer().min(1).max(365).default(30),
  top: Joi.number().integer().min(1).max(25).default(8)
});

export const validateInsightAnalyticsEventPayload = (body) => {
  const source = normalizeSource(body);
  const { value, error } = eventPayloadSchema.validate(source, VALIDATION_OPTIONS);

  return {
    errors: toErrors(error),
    payload: {
      sessionId: value?.sessionId || "",
      eventType: value?.eventType || "",
      page: value?.page || "",
      targetType: value?.targetType || "",
      targetId: value?.targetId || "",
      targetLabel: value?.targetLabel || "",
      country: value?.country || "",
      metadata: value?.metadata || {}
    }
  };
};

export const validateInsightAnalyticsSummaryQuery = (query) => {
  const source = normalizeSource(query);
  const { value, error } = summaryQuerySchema.validate(source, VALIDATION_OPTIONS);
  return {
    errors: toErrors(error),
    payload: {
      days: value?.days || 30,
      top: value?.top || 8
    }
  };
};
