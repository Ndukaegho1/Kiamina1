import Joi from "joi";

const CATEGORIES = [
  "payroll-governance",
  "sme-accounting-controls",
  "nonprofit-reporting",
  "tax-compliance",
  "financial-strategy",
  "cloud-accounting",
  "regulatory-updates",
  "cross-border-advisory",
  "other"
];
const STATUSES = ["draft", "published", "archived"];
const VISIBILITIES = ["public", "internal"];

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

const normalizeCategory = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

const createInsightSchema = Joi.object({
  title: Joi.string().trim().required().max(200).messages({
    "any.required": "title is required",
    "string.empty": "title is required",
    "string.max": "title must be at most 200 characters"
  }),
  slug: Joi.string().trim().allow("").max(220).default("").messages({
    "string.max": "slug must be at most 220 characters"
  }),
  excerpt: Joi.string().trim().allow("").max(500).default("").messages({
    "string.max": "excerpt must be at most 500 characters"
  }),
  content: Joi.string().trim().required().max(30000).messages({
    "any.required": "content is required",
    "string.empty": "content is required",
    "string.max": "content must be at most 30000 characters"
  }),
  category: Joi.string().trim().allow("").default("financial-strategy"),
  author: Joi.string().trim().allow("").max(120).default("Kiamina Advisory Team"),
  readTimeMinutes: Joi.number().integer().min(1).max(60).default(6),
  coverImageUrl: Joi.string().trim().allow("").max(2000).default(""),
  status: Joi.string().trim().lowercase().valid(...STATUSES).default("draft").messages({
    "any.only": "status must be one of: draft, published, archived"
  }),
  visibility: Joi.string().trim().lowercase().valid(...VISIBILITIES).default("public").messages({
    "any.only": "visibility must be one of: public, internal"
  })
});

const updateInsightSchema = Joi.object({
  title: Joi.string().trim().allow("").max(200).optional(),
  slug: Joi.string().trim().allow("").max(220).optional(),
  excerpt: Joi.string().trim().allow("").max(500).optional(),
  content: Joi.string().trim().allow("").max(30000).optional(),
  category: Joi.string().trim().allow("").optional(),
  author: Joi.string().trim().allow("").max(120).optional(),
  readTimeMinutes: Joi.number().integer().min(1).max(60).optional(),
  coverImageUrl: Joi.string().trim().allow("").max(2000).optional(),
  status: Joi.string().trim().lowercase().valid(...STATUSES).optional(),
  visibility: Joi.string().trim().lowercase().valid(...VISIBILITIES).optional()
});

const listInsightsQuerySchema = Joi.object({
  status: Joi.string().trim().lowercase().valid(...STATUSES).allow("").default(""),
  category: Joi.string().trim().allow("").default(""),
  visibility: Joi.string().trim().lowercase().valid(...VISIBILITIES).allow("").default(""),
  limit: Joi.number().integer().min(1).max(100).default(50)
});

const searchQuerySchema = Joi.object({
  q: Joi.string().trim().allow("").max(200).default(""),
  limit: Joi.number().integer().min(1).max(50).default(10)
});

const coerceCategory = (value, fallback = "financial-strategy") => {
  const normalizedCategory = normalizeCategory(value || fallback);
  return CATEGORIES.includes(normalizedCategory) ? normalizedCategory : fallback;
};

export const validateCreateInsightArticlePayload = (body) => {
  const source = normalizeSource(body);
  const { value, error } = createInsightSchema.validate(source, VALIDATION_OPTIONS);

  return {
    errors: toErrors(error),
    payload: {
      title: value?.title || "",
      slug: value?.slug || "",
      excerpt: value?.excerpt || "",
      content: value?.content || "",
      category: coerceCategory(value?.category, "financial-strategy"),
      author: value?.author || "Kiamina Advisory Team",
      readTimeMinutes: value?.readTimeMinutes || 6,
      coverImageUrl: value?.coverImageUrl || "",
      status: value?.status || "draft",
      visibility: value?.visibility || "public",
      tags: normalizeTags(source.tags)
    }
  };
};

export const buildInsightArticleUpdatePayload = (body) => {
  const source = normalizeSource(body);
  const { value, error } = updateInsightSchema.validate(source, VALIDATION_OPTIONS);
  const payload = {};

  if (value?.title !== undefined) payload.title = normalizeString(value.title);
  if (value?.slug !== undefined) payload.slug = normalizeString(value.slug);
  if (value?.excerpt !== undefined) payload.excerpt = normalizeString(value.excerpt);
  if (value?.content !== undefined) payload.content = normalizeString(value.content);
  if (value?.category !== undefined) payload.category = coerceCategory(value.category, "other");
  if (value?.author !== undefined) payload.author = normalizeString(value.author) || "Kiamina Advisory Team";
  if (value?.readTimeMinutes !== undefined) payload.readTimeMinutes = Number(value.readTimeMinutes);
  if (value?.coverImageUrl !== undefined) payload.coverImageUrl = normalizeString(value.coverImageUrl);
  if (value?.status !== undefined) payload.status = value.status;
  if (value?.visibility !== undefined) payload.visibility = value.visibility;
  if (source.tags !== undefined) payload.tags = normalizeTags(source.tags);

  return {
    errors: toErrors(error),
    payload
  };
};

export const validateInsightListQuery = (query) => {
  const source = normalizeSource(query);
  const { value, error } = listInsightsQuerySchema.validate(source, VALIDATION_OPTIONS);

  return {
    errors: toErrors(error),
    payload: {
      status: value?.status || "",
      category: value?.category ? coerceCategory(value.category, "other") : "",
      visibility: value?.visibility || "",
      limit: value?.limit || 50
    }
  };
};

export const validateInsightSearchQuery = (query) => {
  const source = normalizeSource(query);
  const { value, error } = searchQuerySchema.validate(source, VALIDATION_OPTIONS);

  return {
    errors: toErrors(error),
    payload: {
      q: value?.q || "",
      limit: value?.limit || 10
    }
  };
};
